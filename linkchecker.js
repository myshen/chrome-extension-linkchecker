String.prototype.startsWith = function(text) {
  return this.substr(0, text.length) == text;
};
String.prototype.endsWith = function(text) {
  return this.substr(-text.length) == text;
};
chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    var animateSpeed = 600;
    var anchors = $("a");
    var checked = 0;
    var checkStatus = $("<div></div>")
      .css({"width": "50%",
            "position": "absolute", "top": "0"})
      .hide()
      .progressbar({value: 0, change: function (event, ui) {
            if (checked == anchors.size()) {
              checkStatus.hide(animateSpeed);
            }
          }})
      .appendTo("body");
    $(".ui-progressbar-value", checkStatus)
      .css({"height": "100%",
            "background-image": "url(http://jqueryui.com/demos/progressbar/images/pbar-ani.gif)"});
    function checkURL(url, link) {
      chrome.extension.sendRequest({"action": "check", "url": url}, 
        function (response) {
          if (response) {
            if (200 <= response.status && response.status < 400) {
              link.css("background-color", "#afa");
            } else {
              console.log("Failed link XHR", response, link[0]);
              link.css("background-color", "#faa");
            }
            checked++;
            checkStatus.progressbar({"value": checked / anchors.size()*100});
          }
        });
    }
    checkStatus.show(animateSpeed);
    anchors.each(function () {
      var link = $(this);
      var url = link.attr('href');
      
      if (url && !url.startsWith("http")) {
        if (window.location.href.endsWith("/") && url.startsWith("/")) {
          url = window.location.href.slice(0, -1) + url;
        } else {
          url = window.location.href + url;
        }
      }

      // before send
      link.css("background-color", "#ffa");

      checkURL(url, link);
    });
    //checkStatus.hide();
    sendResponse({});
  });
