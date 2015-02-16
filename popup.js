(function () {
  // When the button is clicked, run through the given tab's links.
  var btn_start = document.createElement("BUTTON");

  var btn_clear = document.createElement("BUTTON");
  btn_clear.innerHTML = "Clear markings";
  btn_clear.style.display = "none";

  var status_msg = document.createElement("P");
  status_msg.style.width = "100px";

  var div = document.createElement("DIV");
  div.display = "none";
  div.appendChild(btn_start);
  div.appendChild(btn_clear);
  div.appendChild(status_msg);

  document.body.appendChild(div);

  function ui_started() {
    btn_start.innerHTML = "Clear markings";
    // btn_clear.style.display = "block";
    // btn_start.disabled = "disabled";
  }
  function ui_reset() {
    btn_start.innerHTML = "Start check!";
    //btn_start.disabled = "";
    status_msg.display = "none";
  }

  var started;

  btn_start.onclick = function () {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
      for (var i = 0; i < tabs.length; i++) {
        var tabid = tabs[i].id;
        if (started) {
          chrome.tabs.sendMessage(tabid, {action: "clearMarkings"});
          chrome.browserAction.setBadgeText({text: "", tabId: tabid});
        } else {
          chrome.browserAction.setBadgeBackgroundColor(
            {color: "#888", tabId: tabid});
          chrome.browserAction.setBadgeText({text: "...", tabId: tabid});
          chrome.tabs.sendMessage(tabid, {action: "startCheck"});
        }
      }

      if (started) {
        ui_reset();
      } else {
        ui_started();
      }
      started = !started;
    });
  };

  btn_clear.onclick = function () {
    btn_clear.style.display = "none";
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
      for (var i = 0; i < tabs.length; i++) {
        var tabid = tabs[i].id;
      }
    });
    ui_reset();
  };

  function updateStatus(numBad) {
    if (numBad === null) {
      status_msg.innerHTML = "";
    } else {
      var msg = "";
      if (numBad > 0) {
        msg = numBad + ' ' + (numBad == 1 ? 'error' : 'errors') +
         ' occurred while checking links. Open the developer ' +
         'tools (⌘-option-j/ctrl-shift-j) to see which ' + 
         'links failed.';
      } else if (numBad == -1) {
        msg = "Check in progress.";
      } else if (numBad == 0) {
        msg = "All links ok.";
      }
      status_msg.innerHTML = msg;
    }
    status_msg.display = "block";
  }

  chrome.extension.onMessage.addListener(function(request, sender) {
    if (request.action == "updatedStatus") {
      chrome.storage.sync.get("linkchecker-ongoing", function (items) {
        var numBad;
        if (chrome.runtime.lastError !== undefined) {
        } else {
          numBad = items["linkchecker-ongoing"];
        }
        updateStatus(numBad);
      });
    }
  });

  // sync with saved status
  chrome.storage.sync.get("linkchecker-ongoing", function (items) {
    if (chrome.runtime.lastError !== undefined) {
      started = true;
      ui_started();
    } else {
      var numBad = items["linkchecker-ongoing"];
      if (numBad !== null) {
        started = true;
        ui_started();
      } else {
        started = false;
        ui_reset();
      }
      updateStatus(numBad);
    }
    // curtains up!
    div.display = "block";
  });
})();
