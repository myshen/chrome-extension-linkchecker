(function() {
var animateSpeed = 600;
var anchors = $("a");
var checked = 0;
var bad = 0;
var checkStatusHolder = $("<div></div>")
  .css({"width": "50%", "position": "fixed",
        "background": "#dddddd", "zIndex": 9999999,
        "bottom": 0, 'padding': '0.5em 1em'})
  .hide()
  .hover(function () {
    $(this).fadeTo(animateSpeed, 1);
  }, function () {
    $(this).fadeTo(animateSpeed, 0.3);
  });
var checkStatus = $("<span></span>").appendTo(checkStatusHolder);
var closeButton = $('<button>Clear LinkChecker markings from page</button>')
  .appendTo(checkStatusHolder)
  .css('margin-left', '1em')
  .click(function () {
    checkStatusHolder.hide(animateSpeed).remove();
    anchors.each(function () {
      $(this).css('background-color', $(this).data('linkchecker_saved_bgc'));
    });
  });
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

var links = [];
function checkURI(uri, link) {
  link.data('linkchecker_saved_bgc', link.css('background-color'));
  link.css("background-color", "#ffa");
  links.push(link);
  var checkMessage = {
    "base": window.location.href,
    "action": "check",
    "uri": uri,
    "link": links.length - 1
  };
  chrome.extension.sendMessage(checkMessage);
}

chrome.extension.onMessage.addListener(function(request, sender) {
  if (request.action == "startCheck") {
    checkStatusHolder.appendTo("body").show(animateSpeed);
    anchors.each(function () {
      var link = $(this);
      var uri = link.attr('href');
      if (!uri) {
        checkedPlusPlus();
      } else {
        checkURI(uri, link);
      }
    });
  } else if (request.action == "linkStatus") {
    var link = links[request.link];
    if (200 <= request.status && request.status < 400) {
      link.css("background-color", "#afa");
    } else {
      if (request.status == 0) {
        // UNSENT, OPENED or error
        console.log("XHR timed out or UNSENT/OPENED", link[0]);
        link.css("background-color", "#aaf");
        bad++;
      } else {
        console.log(request.status, link[0]);
        link.css("background-color", "#faa");
      }
    }
    checkedPlusPlus();
  }
});
})();
