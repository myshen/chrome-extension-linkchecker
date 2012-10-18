var responseAction = "linkStatus";
function response(link, status, javascript) {
  var o = {
    "link": link,
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
  var default_timeout = 10000;
  return function(link, url, callback, timeout, method) {
    var xhr = new XMLHttpRequest();
    var timeoutTimer = null;
    // Sends XHR back to client page when 
    // "All redirects (if any) have been followed and all HTTP headers of the
    // final response have been received. Several response members of the
    // object are now available." http://www.w3.org/TR/XMLHttpRequest/#states
    xhr.onreadystatechange = function (data) {
      // If HEADERS_RECEIVED
      if (xhr.readyState >= 2) {
        clearTimeout(timeoutTimer);
        callback(response(link, xhr.status));
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
      console.log('timeout: aborting request for', url);
      xhr.abort();
    }, timeout);
    try {
      xhr.send();
    } catch (e) {
      console.log("Could not send XHR", e);
      callback(response(link, 0));
    }
  };
})();

// Listen for link check requests from the page.
// These are generated one per link found on the page where the extension
// button is clicked.
chrome.extension.onMessage.addListener(
  function (request, sender) {
    var tab_id = sender.tab.id;
    var uri = new URI(request.uri).resolve(new URI(request.base));
    if (uri.getScheme() == 'javascript' ||
        uri.getScheme() == 'mailto'
       ) {
      chrome.tabs.sendMessage(tab_id, response(request.link, 200, true));
      return true;
    }

    if (request.action == "check") {
      uri = uri.toString();
      if (uri) {
        http(request.link, uri, function(resp) {
          if (resp.status == 405) {
            http(request.link, uri, function(resp) {
              chrome.tabs.sendMessage(tab_id, resp);
            }, request.timeout, 'GET');
          } else {
            chrome.tabs.sendMessage(tab_id, resp);
          }
        }, request.timeout);
        return false;
      } else {
        // No URI given
        chrome.tabs.sendMessage(tab_id, response(request.link, 1));
      }
    } else {
      // Invalid action
      chrome.tabs.sendMessage(tab_id, response(request.link, 2));
    }
    return true;
  }
);

// When the extension button is clicked, run through the given tab's links.
chrome.browserAction.onClicked.addListener(function (tab) {
  chrome.tabs.getSelected(null, function (tab) {
    chrome.tabs.sendMessage(tab.id, {"action": "startCheck"});
  });
});
