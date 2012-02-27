$(document).ready(function() {
    var webView = new WebView();

    if (chrome.extension.getBackgroundPage().isActive) {
        $('#toggleLink').html('enabled');
        $('#toggleLink').addClass('green').removeClass('red');
    } else {
        $('#toggleLink').html('disabled');
        $('#toggleLink').addClass('red').removeClass('green');
    }

    if (webView.logger.getLogsCount() > 0) {
        webView.generateHtmlLog();
    } else {
        $('#content').html('<em>Fever<strong>PHP</strong></em> suggests that you <strong>reload</strong> the page to track' +
                            ' <em>FirePHP</em> messages for all the requests.');
    }

    $('#content')
        .on('click', 'h1, h2, h3', $.proxy(webView.toggleGroups, webView))
        .on('click', '.object', $.proxy(webView.togglePrintObject, webView));
    $('body')
        .on('click', '#toggleLink', $.proxy(webView.toggleApp, webView))
        .on('click', '#collapseAllLink', $.proxy(webView.collapseAll, webView))
        .on('click', '#extendAllLink', $.proxy(webView.extendAll, webView))
        .on('click', '#clearLogsLink', $.proxy(webView.clearLogs, webView));

    $('#content h1, #content h2, #content div.line').mouseenter(function(){
       var position = $(this).position();
       var innerWidth = $(this).innerWidth();
       var innerHeight = $(this).innerHeight();

       var id = this.id.split("_");
       var infoboxWidth = $(this).find(".infobox").outerWidth();

       $(this).find(".infobox").css({
           'top': position.top+3,
           'left': (position.left+innerWidth-infoboxWidth),
           'height': innerHeight
           });
       $(this).find(".infobox").show();
    }).mouseleave(function(){
       $(this).find(".infobox").hide();
    });

    $('img.comment').tipsy({
        gravity: 'e',
        html: true
    });

    $('abbr').tipsy({
        gravity: $.fn.tipsy.autoNS,
        html: true
    });

    window.setInterval(function() {
        $('.fromNow').each(function() {
            $(this).html(moment($(this).data('timeStamp')).fromNow());
        });
    }, 1000);

    $('.url').prev('h1').last().trigger('click');
});