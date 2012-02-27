var logger  = new Logger(),
    firePHPTabId = 0,
    lastUsedTab = 0;
        
if (localStorage !== undefined && localStorage['isActive'] !== undefined && localStorage['isActive'] === true) {
    isActive = true;
    chrome.browserAction.setIcon({'path': '/Images/icon_on_small.png'});
} else {
    isActive = false;
    chrome.browserAction.setIcon({'path': '/Images/icon_off_small.png'});
}
 

chrome.browserAction.onClicked.addListener(function(tab) {
    if (firePHPTabId != tab.id) {
        if (firePHPTabId > 0) {
            chrome.tabs.query({}, function(tabs) {
                tabs = _.pluck(tabs, 'id');
                if (_.include(tabs, firePHPTabId) !== false) {
                    chrome.tabs.reload(firePHPTabId);
                    chrome.tabs.move(firePHPTabId, {'windowId': tab.windowId, 'index': tab.index+1});
                    chrome.tabs.update(firePHPTabId, {'selected': true});
                    return;
                }
            });
        }

        chrome.tabs.create({'windowId': tab.windowId, 'selected': true, 'url': 'Html/popup.html', 'index': tab.index+1},
            function(createdTab) {
                firePHPTabId = createdTab.id;
        });

    } else {
        chrome.tabs.reload(firePHPTabId);
    }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        if (isActive) {
            if (details.type == 'main_frame' && lastUsedTab != details.tabId) {
                logger.clear();
                lastUsedTab = details.tabId;

                chrome.browserAction.setBadgeText({text: ''});
            }

            details.requestHeaders.push({'name': 'X-FirePHP-Version', 'value': '0.6'});
        }
        return {requestHeaders: details.requestHeaders};
    },
    {urls: ["https://*/*", "http://*/*"]},
    ["requestHeaders", "blocking"]
);

// TODO:
// chrome.webRequest.onErrorOccurred.addListener(
//     function(details) {
//         if (isActive && details.error == 'net::ERR_RESPONSE_HEADERS_TOO_BIG') {
//             console.error(details.error+' at tab '+details.tabId+' with url: '+details.url);
//             isActive = false;
//             chrome.tabs.reload(details.tabId);
//         }
//     });

chrome.webRequest.onCompleted.addListener(
    function(details) {
        if (isActive) {
            var logsCount = logger.log(details).getLogsCount();
            if (logsCount > 0) {
                chrome.browserAction.setBadgeText({text: logsCount.toString()});
            }
        }
    },
    {urls: ["https://*/*", "http://*/*"]},
    ["responseHeaders"]
);
