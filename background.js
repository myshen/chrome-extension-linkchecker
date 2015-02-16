// http://stackoverflow.com/a/6700/533198
Object.size = function(obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};

function TabResultAggregator(tab_id, send_callback) {
  this.batchSize = Math.pow(2, 5);

  this.results = [];

  this.tab_id = tab_id;
  if (send_callback === undefined) {
    this.send_callback = this.send_statuses;
  } else {
    this.send_callback = send_callback;
  }
}
TabResultAggregator.prototype = new Object();
TabResultAggregator.prototype.send = function(force) {
  if (force || this.results.length >= this.batchSize) {
    this.send_callback(this.tab_id, this.results);
    this.results = [];
  }
};
TabResultAggregator.prototype.add = function(item) {
  this.results.push(item);
  this.send();
};
TabResultAggregator.prototype.flush = function() {
  this.send(true);
};
TabResultAggregator.prototype.send_statuses = function(tab_id, statuses) {
  var resp = {
    action: "linkStatuses",
    statuses: statuses
  };
  chrome.tabs.sendMessage(tab_id, resp);
}

var responseAction = "linkStatus";
function response(id, status, javascript) {
  var o = {
    "id": id,
    "action": responseAction,
    "status": status
  };
  if (javascript) {
    o.javascript = javascript;
  }
  return o;
}
var http = (function () {
  var default_method = "HEAD";
  var default_timeout = 5 * 1000;
  return function(id, url, callback, timeout, method) {
    var xhr = new XMLHttpRequest();
    var timeoutTimer = null;
    // Sends XHR back to client page when 
    // "All redirects (if any) have been followed and all HTTP headers of the
    // final response have been received. Several response members of the
    // object are now available." http://www.w3.org/TR/XMLHttpRequest/#states
    var calledback = false;
    xhr.onreadystatechange = function (data) {
      // If HEADERS_RECEIVED
      if (xhr.readyState >= 2 && !calledback) {
        clearTimeout(timeoutTimer);
        callback(response(id, xhr.status));
        calledback = true;
      }
    };
    if (!method) {
      method = default_method;
    }
    xhr.open(method, url, true);
    if (!timeout) {
      timeout = default_timeout;
    }
    timeoutTimer = setTimeout(function () {
      console.log('timeout: aborting', method, url, 'after', timeout, 'usec');
      xhr.abort();
    }, timeout);
    try {
      xhr.send();
    } catch (e) {
      console.log("Could not send XHR", e);
      callback(response(id, 0));
    }
  };
})();

// id - the id of the anchor
// uri - the URI to check
// tab_id - the tab to send the result of the check to
function checkLink(id, uri, tab_id, timeout, callback) {
  uri = uri.toString();
  if (uri) {
    http(id, uri, function(resp) {
      if (resp.status == 405) {
        http(id, uri, function(resp) {
          callback(resp);
        }, timeout, 'GET');
      } else {
        callback(resp);
      }
    }, timeout);
    return false;
  } else {
    // No URI given
    callback(response(id, 1));
  }
}

// http://stackoverflow.com/questions/1418050/string-strip-for-javascript
// http://blog.stevenlevithan.com/archives/faster-trim-javascript
String.prototype.trim = function () {
  return String(this).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

var STORAGE_KEY_BLACKLIST = "linkchecker-blacklist";
function matchBlacklist(uri, blacklist) {
  var rules = [];
  var lines = blacklist.split("\n");
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    if (line.length > 0 && line[0] == "#") {
      continue;
    }
    line = line.trim();
    if (line.length == 0) {
      continue;
    }
    rules.push(line);
  }

  var uri_text = uri.toString();
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    try {
      if (uri_text == rule) {
        return true;
      }
      if (uri_text.match(new RegExp(rule))) {
        return true;
      }
    } catch (err) {
      console.error(err, uri_text);
    }
  }
  return false;
}

var aggs = {};
function getAgg(id) {
  var agg = aggs[id];
  if (agg === undefined) {
    agg = aggs[id] = new TabResultAggregator(id);
  }
  return agg;
}

function CheckPool(operation) {
  this.limit = Math.pow(2, 7);
  this.operation = operation;
  this.requests = []; // Queue with head at end of list
  this.outstanding = {};
  this._pause = false;
}
CheckPool.prototype = new Object();
CheckPool.prototype.anyLeft = function () {
  return this.requests.length > 0 || Object.size(this.outstanding) > 0;
};
CheckPool.prototype.operate = function () {
  if (!this._pause && (
        this.requests.length > 0 && Object.size(this.outstanding) < this.limit)
      ) {
    var req = this.requests.pop();
    this.outstanding[req.id] = true;
    this.operation(req);
    return true;
  } else {
    if (!this.anyLeft()) {
      for (var key in aggs) {
        aggs[key].flush();
      }
    }
    return false;
  }
};
CheckPool.prototype.pause = function () {
  this._pause = true;
};
CheckPool.prototype.start = function () {
  this._pause = false;
  while (this.operate()) {}
};
CheckPool.prototype.add = function (requests) {
  if (!requests instanceof Array) {
    requests = [requests];
  }
  Array.prototype.unshift.apply(this.requests, [requests]);
  this.operate();
};
CheckPool.prototype.complete = function (id) {
  delete this.outstanding[id];
  this.operate();
};

var checkPool = new CheckPool(function(req) {
  var self = this;
  checkLink(req.id, req.uri, req.tab_id, req.timeout, function(resp) {
    getAgg(req.tab_id).add(resp);
    self.complete(req.id);
  });
});

function handleCheckRequest(blacklist, tab_id, uri_base, id, uri_str, timeout) {
  var uri = new URI(uri_str).resolve(uri_base);

  if (uri.getScheme() == 'javascript' ||
      uri.getScheme() == 'mailto'
     ) {
    getAgg(tab_id).add(response(id, 200, true));
    return;
  }

  if (matchBlacklist(uri, blacklist)) {
    getAgg(tab_id).add(response(id, -1, true));
    return;
  }
  checkPool.add({
    id: id, uri: uri, tab_id: tab_id, timeout: timeout
  });
}

chrome.extension.onMessage.addListener(function (request, sender) {
  if (request.action == "setBadge") {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
      for (var i = 0; i < tabs.length; i++) {
        var tab_id = tabs[i].id;
        chrome.browserAction.setBadgeBackgroundColor({color: request.color, tabId: tab_id});
        chrome.browserAction.setBadgeText({text: request.text, tabId: tab_id});
      }
    });
  } else if (request.action == "checkLinks") {
    var tab_id = sender.tab.id;
    var uri_base = new URI(request.base);

    chrome.storage.sync.get(STORAGE_KEY_BLACKLIST, function(item) {
      if (chrome.runtime.lastError !== undefined) {
        console.error("linkchecker blacklist failed to load");
      } else {
        var blacklist = item[STORAGE_KEY_BLACKLIST];

        checkPool.pause();
        for (var i = 0; i < request.uris.length; i++) {
          handleCheckRequest(
            blacklist, tab_id, uri_base, i, request.uris[i], request.timeout);
        }
        checkPool.start();
      }
    })
  }
});
