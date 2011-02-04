chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    var animateSpeed = 600;
    var anchors = $("a");
    var checked = 0;
    var bad = 0;
    var checkStatus = $("<div></div>")
      .css({"width": "50%", "position": "absolute", "top": 0})
      .hide()
      .appendTo("body");
    checkStatus.show(animateSpeed);
    function checkedPlusPlus() {
      checked++;
      var percent = Math.round(checked / anchors.size() * 100);
      checkStatus.html(percent + '%');
      if (percent >= 100) {
        if (bad > 0) {
          checkStatus.css('background', '#f55');
          checkStatus.html(bad + (bad == 1 ? 'error' : 'errors') +
                           ' occurred while checking links');
        } else {
          checkStatus.remove();
        }
      }
    }
    function checkURI(uri, link) {
      link.css("background-color", "#ffa");
      chrome.extension.sendRequest({"action": "check", "uri": uri}, 
        function (response) {
          if (response) {
            if (200 <= response.status && response.status < 400) {
              link.css("background-color", "#afa");
            } else {
              if (response.status == 0) {
                // UNSENT, OPENED or error
                console.log("XHR timed out or UNSENT/OPENED", link[0]);
                link.css("background-color", "#aaf");
                bad++;
              } else {
                console.log("Failed link", response, link[0]);
                link.css("background-color", "#faa");
              }
            }
            checkedPlusPlus();
          }
        });
    }
    var base = new URI(window.location.href);
    anchors.each(function () {
      var link = $(this);
      var uri = link.attr('href');

      if (!uri) {
        return checkedPlusPlus();
      }

      uri = new URI(uri).resolve(base);

      if (uri.getScheme() == 'javascript') {
        return checkedPlusPlus();
      }
      
      checkURI(uri.toString(), link);
    });
    sendResponse();
  });
