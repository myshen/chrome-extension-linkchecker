(function () {
  var header = document.createElement("H1");
  header.innerHTML = "Blacklist";
  document.body.appendChild(header);

  var storage_key_blacklist = "linkchecker-blacklist";

  var textarea = document.createElement("TEXTAREA");
  textarea.style.width = "600px";
  textarea.style.height = "400px";
  var indicator = document.createElement("P");

  var btn_save = document.createElement("BUTTON");
  function btn_save_saved(msg) {
    btn_save.disabled = "disabled";
    if (msg === undefined) {
      msg = "saved";
    }
    indicator.innerHTML = "";
    btn_save.innerHTML = msg;
  }
  function btn_save_unsaved() {
    btn_save.disabled = "";
    btn_save.innerHTML = "save changes";
  }

  document.body.appendChild(textarea);
  document.body.appendChild(indicator);
  document.body.appendChild(btn_save);

  indicator.style.color = "#eeeeee";
  chrome.storage.sync.get(storage_key_blacklist, function (items) {
    if (chrome.runtime.lastError !== undefined) {
      indicator.style.color = "#ffaaaa";
      indicator.innerHTML = chrome.runtime.lastError;
      btn_save_unsaved();
    } else {
      var val = items[storage_key_blacklist];
      if (val !== undefined) {
        textarea.value = val;
      } else {
        textarea.value = "# blacklist urls by regexp; skipped urls will be " +
          "marked with grey background";
      }
      btn_save_saved();
    }
  });

  textarea.onkeyup = function() {
    btn_save_unsaved();
  };

  btn_save.onclick = function() {
    btn_save_saved("saving...");
    var dict = {};
    dict[storage_key_blacklist] = textarea.value
    chrome.storage.sync.set(dict, function () {
      if (chrome.runtime.lastError !== undefined) {
        indicator.style.color = "#ffaaaa";
        indicator.innerHTML = chrome.runtime.lastError;
        btn_save_unsaved();
      } else {
        btn_save_saved();
      }
    });
  };

})();
