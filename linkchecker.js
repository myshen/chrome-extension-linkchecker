(function() {
  var KEY_PREFIX = "linkchecker";
  var KEY_BGC = KEY_PREFIX + "_saved_bgc";

  // http://stackoverflow.com/a/6700/533198
  Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) size++;
    }
    return size;
  };

  // Save the job status and notify the the popup
  function updateJobStatus(value) {
    chrome.storage.sync.set({"linkchecker-ongoing": value}, function() {
      chrome.runtime.sendMessage(null, {action: "updatedStatus"});
    });
  }

  function Job(selection) {
    this.selection = selection;
    this.anchors = [];
    this.uris = [];
    this.checked = {};
    this.bad = 0;

    this.addSelection(selection);
  }
  Job.prototype = new Object();
  Job.prototype.begin = function() {
    var uris = this.uris;
    var checkMessage = {
      "base": window.location.href,
      "action": "checkLinks",
      "uris": uris
    };
    for (var i = 0; i < uris.length; i++) {
      var anchor = this.anchors[i];
      anchor.data(KEY_BGC, anchor.css('background-color'));
      anchor.css("background-color", "#ffa");
    }
    chrome.extension.sendMessage(checkMessage);
  };
  Job.prototype.addSelection = function(selection) {
    var self = this;
    selection.each(function() { self.addAnchor($(this)); });
  };
  Job.prototype.addAnchor = function(anchor) {
    var uri = anchor.attr('href');
    if (!uri) {
    } else {
      this.anchors.push(anchor);
      this.uris.push(uri);
    }
  };
  Job.prototype.addStatus = function(id, reqstat) {
    var anchor = this.anchors[id];
    var uri = this.uris[id];
    var bad = false;
    if (200 <= reqstat && reqstat < 400) {
      anchor.css("background-color", "#afa");
    } else {
      var msg = "",
          color = "#faa";
      if (reqstat == 0) {
        // UNSENT, OPENED or error
        msg = "XHR timed out or UNSENT/OPENED";
        color = "#aaf";
        bad = true;
      } else if (reqstat == -1) {
        // blacklisted
        msg = "blacklisted link";
        color = "#ddd";
      } else if (reqstat == 1) {
        // no URI given
        msg = "no URI given";
        color = "#aaf";
      } else if (reqstat == 2) {
        // invalid action
        msg = "invalid method HEAD";
        color = "#aaf";
      } else {
        msg = reqstat;
        color = "#faa";
      }

      if (anchor === undefined) {
        console.error('LC: link', id, 'is undefined');
      } else {
        console.log("LC: " + msg, anchor[0]);
        anchor.css("background-color", color);
      }
    }
    this.checked[id] = bad;
  };
  Job.prototype.countBad = function() {
    var count = 0;
    for (var i = 0; i < this.checked.length; i++) {
      if (this.checked[i]) {
        count += 1;
      }
    }
    return count;
  };
  Job.prototype.percentComplete = function() {
    return Math.round(
        Object.size(this.checked) / Object.size(this.anchors) * 100);
  };
  Job.prototype.clearMarkings = function() {
    this.selection.each(function () {
      $(this).css('background-color', $(this).data(KEY_BGC));
    });
  };
  Job.prototype.updateChecked = function() {
    var percent = this.percentComplete();
    var badge = percent + "%";
    var color = "#000";

    if (percent >= 100) {
      var bad = this.countBad();
      if (bad > 0) {
        badge = ":(";
        color = "#f44";
      } else {
        badge = ":)";
        color = "#4f4";
      }
      updateJobStatus(bad);
    }
    chrome.runtime.sendMessage(
      null, {action: "setBadge", text: badge, color: color});
  };

  var job;
  chrome.runtime.onMessage.addListener(function(request, sender) {
    if (request.action == "startCheck") {
      if (job !== undefined) {
        job.clearMarkings();
        delete job;
      }
      anchors = $("a");
      job = new Job(anchors);
      job.begin();
      updateJobStatus(-1);
    } else if (request.action == "linkStatuses") {
      var lstatuses = request.statuses;
      for (var i = 0; i < lstatuses.length; i++) {
        var lstatus = lstatuses[i];
        job.addStatus(lstatus.id, lstatus.status);
      }
      job.updateChecked();
    } else if (request.action == "clearMarkings") {
      if (job) {
        job.clearMarkings();
      }
      updateJobStatus(null);
    }
  });
  window.onbeforeunload = function() {
    chrome.storage.sync.set({"linkchecker-ongoing": null});
  };
})();
