function Logger() {
    this.wfToChromeMap= {
        "LOG": "log",
        "INFO": "info",
        "WARN": "warn",
        "ERROR": "error",
        "TABLE": "table",
        "EXCEPTION": "exception",
        "TRACE": "trace",
        "GROUP_START": "groupStart",
        "GROUP_END": "groupEnd"
    };

    this.meta = [
        /X-Wf-Protocol-[\d]*/i,
        /X-Wf-[\d]*-Plugin-[\d]*/i,
        /X-Wf-[\d]*-Structure-[\d]*/i
    ];

    this.logging = [
        /X-Wf-[\d]*-[\d]*-[\d]*-([\d]*)/i
    ];

    this.commandMessage = /(?:\d+)?\|(.+)/;

    this.logMessages = {};
    this.logsCount = 0;
}

Logger.prototype.log = function(webRequest) {
    var json = '';
    _.each(webRequest.responseHeaders, function(item) {
        var logKey = item.name.match(this.logging[0]);
        if (logKey) {
            var commandParts = item.value.match(this.commandMessage);

            json += commandParts[1].substring(0, commandParts[1].lastIndexOf("|"));

            if (commandParts[1].charAt(commandParts[1].length - 1) !== "\\") {
                var msg = JSON.parse(json),
                meta = msg[0],
                body = msg[1],
                idx = parseInt(logKey[1], 10);

                if (meta.Type in this.wfToChromeMap) {
                    if (this.logMessages[webRequest.url] === undefined) {
                        this.logMessages[webRequest.url] = {};
                    }

                    if (this.logMessages[webRequest.url][webRequest.requestId] === undefined) {
                        this.logMessages[webRequest.url][webRequest.requestId] = {
                            timeStamp: webRequest.timeStamp,
                            method: webRequest.method,
                            messages: []
                        };
                    }

                    this.logsCount++;

                    var action = this.wfToChromeMap[meta.Type];
                    this.logMessages[webRequest.url][webRequest.requestId].messages.push({
                        'idx': idx,
                        'meta': meta,
                        'body': body,
                        'action': action
                    });
                }

                json = '';
            }
        }
    }, this);

    if (this.logMessages[webRequest.url] !== undefined && this.logMessages[webRequest.url][webRequest.requestId] !== undefined) {
        this.logMessages[webRequest.url][webRequest.requestId].messages.sort(function (a, b) {
            return a.idx - b.idx;
        });
    }

    return this;
};

Logger.prototype.clear = function() {
    this.logsCount = 0;
    this.logMessages = {};
};

Logger.prototype.getLogsCount = function() {
    return this.logsCount;
};

Logger.prototype.getLogs = function() {
    return this.logMessages;
};
