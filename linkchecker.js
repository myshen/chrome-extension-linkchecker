chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    var animateSpeed = 600;
    var anchors = $("a");
    var checked = 0;
    var bad = 0;
    var checkStatusHolder = $("<div></div>")
      .css({"width": "50%", "position": "absolute",
            "background": "#ffffff",
            "top": 0, 'padding': '0.5em 1em'})
      .hide()
      .hover(function () {
        $(this).fadeTo(animateSpeed, 1);
      }, function () {
        $(this).fadeTo(animateSpeed, 0.3);
      })
      .appendTo("body");
    var checkStatus = $("<span></span>").appendTo(checkStatusHolder);
    var closeButton = $('<button>Clear markings</button>').appendTo(checkStatusHolder)
      .css('margin-left', '1em')
      .click(function () {
        checkStatusHolder.hide(animateSpeed).remove();
        anchors.each(function () {
          $(this).css('background-color', $(this).data('linkchecker_saved_bgc'));
        });
      });
    checkStatusHolder.show(animateSpeed);
    function checkedPlusPlus() {
      checked++;
      var percent = Math.round(checked / anchors.size() * 100);
      checkStatus.html(percent + '%');
      if (percent >= 100) {
        if (bad > 0) {
          checkStatusHolder.css('background', '#ff5555');
          checkStatus.html(bad + ' ' + (bad == 1 ? 'error' : 'errors') +
              ' occurred while checking links. Open the developer ' +
              'tools (command-option-j/ctrl-shift-j) to see which ' + 
              'links failed.');
        } else {
          checkStatus.html('All links OK');
        }
        checkStatusHolder.fadeTo('slow', 0.3);
      }
    }
    function checkURI(uri, link) {
      link.data('linkchecker_saved_bgc', link.css('background-color'));
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
