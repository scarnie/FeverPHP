function WebView() {
    this.backgroundPage = chrome.extension.getBackgroundPage();
    this.logger = this.backgroundPage.logger;
}

WebView.prototype.toggleGroups = function(e) {
    var target;
    if(_.include(['H1', 'H2', 'H3'], e.target.nodeName)) {
        target = e.target;
    } else {
        target = $(e.target).parent();
    }

    if ($(target).next('.toggle').hasClass('url')) {
        if ($(target).next('.toggle').children('.request').length > 0) {
            $(target).next('.toggle').children('h1, h2, h3').last().trigger('click');
        }
    }

    $(target).next('.toggle').toggle();
    $(target).toggleClass('closed').toggleClass('open');

};

WebView.prototype.collapseAll = function(e) {
    $('#content div.toggle').each(function(){
        $(this).show();
        $(this).prev('h1, h2, h3').removeClass('closed').addClass('open');
    });
};

WebView.prototype.extendAll = function(e) {
    $('#content div.toggle').each(function(){
        $(this).hide();
        $(this).prev('h1, h2, h3').addClass('closed').removeClass('open');
    });
};

WebView.prototype.togglePrintObject = function(e) {
    var result = '<pre style="width:'+$(window).width()*0.90+'px; height:'+$(window).height()*0.75+'px; overflow:auto;">'+
                    $(e.target).children("#html").html()+
                    '</pre>';
    jQuery.facebox(result);
};

WebView.prototype.toggleApp = function(e) {
    if (this.backgroundPage.isActive) {
       chrome.browserAction.setIcon({'path': '/Images/icon_off_small.png'});
       chrome.extension.getBackgroundPage().isActive = false;
       $('#toggleLink').html('disabled');
       $('#toggleLink').addClass('red').removeClass('green');
       chrome.browserAction.setBadgeText({text: ''});
    } else {
       chrome.browserAction.setIcon({'path': '/Images/icon_small.png'});
       chrome.extension.getBackgroundPage().isActive = true;
       $('#toggleLink').html('enabled');
       $('#toggleLink').addClass('green').removeClass('red');
       if (this.logger.getLogsCount() > 0)
          chrome.browserAction.setBadgeText({text: this.logger.getLogsCount().toString()});
    }
};

WebView.prototype.generateUrl = function(url) {
    $('#content').append('<h1 class="closed">'+url+'</h1><div class="url toggle" style="display:none;"></div>');
};

WebView.prototype.generateRequest = function(requestId, requestData) {
    $('#content div.url:last').append('<h2 class="closed"><strong class="blue">'+requestData.method+'</strong> request <span class="fromNow" data-time-stamp="'+requestData.timeStamp+'"></span></h1><div class="request toggle" style="display:none;"></div>');
};

WebView.prototype.generateHtmlLog = function () {
    _.each(this.logger.getLogs(), function(requests, url) {
        this.generateUrl(url);

        _.each(requests, function(requestData, requestId) {
            this.generateRequest(requestId, requestData);

            _.each(requestData.messages, function(msg, key) {
                this.generateLog(msg);
            }, this);
        }, this);
    }, this);
};

WebView.prototype.generateLog = function(log) {
    var result = '';
    switch (log.action) {
        case 'log':
        case 'info':
        case 'warn':
        case 'error':
            result = this.logType(log);
            break;
        case 'table':
            result = this.tableType(log);
            break;
        case 'exception':
            result = this.exceptionType(log);
            break;
        case 'trace':
            result = this.traceType(log);
            break;
        case 'groupStart':
            result = this.groupStartType(log);
            break;
        case 'groupEnd':
            result = this.groupEndType(log);
            break;
        default:
            console.error(log.action, 'FIXME!');
        break;
    }

    if (!_.isEmpty(result)) {
        result = $(result);

        var infoBox = this.generateInfobox(log);
        if (!_.isEmpty(infoBox)) {
            if (result.is("h1, h2")) {
                result.siblings("h1, h2").append(infoBox);
            } else {
                result.append(infoBox);
            }
        }

        if ($('#content div.group:not(.groupEnd):last').length > 0) {
            $('#content div.group:not(.groupEnd):last').append(result);
        } else {
            $('#content div.request:last').append(result);
        }
    }
};

WebView.prototype.logType = function(log) {
    var result = '';
    result += (log.meta.Label ? log.meta.Label + ': ' : '');
    result += '<em>';
    if (typeof(log.body) != 'object') {
        result += log.body;
    } else {
        result += this.printObject(log.body);
    }
    result += '</em>&nbsp;';

    return '<div class="line '+log.meta.Type.toLowerCase()+'">'+result+'</div>';
};

WebView.prototype.tableType = function(log) {
    var tableLabel = '';
    var tableData = [];
    if (log.meta.Label === undefined) {
        if (_.isString(log.body[0])) {
            tableLabel = log.body[0];
            tableData = log.body[1];
        } else {
            tableLabel = 'Unknown table';
            tableData = log.body;
        }

    } else {
        tableLabel = log.meta.Label;
        tableData = log.body;
    }

    var result = '<h2 class="closed table">'+tableLabel+'</h2>'+
                 '<div class="tableGroup toggle" style="display:none;">'+
                 '<div class="tableResult"><table>';

    _.each(tableData, function(row, key) {
        result += '<tr>';
        _.each(row, function(value) {
            if (key === 0) {
                result += '<th>';
            } else {
                result += '<td>';
            }

            result += value;

            if (key === 0) {
                result += '</th>';
            } else {
                result += '</td>';
            }
        });

        result += '</tr>';
    });

    result += '</table></div></div>';

    return result;
};

WebView.prototype.exceptionType = function(log) {
    var result = '<h2 class="closed exception">'+log.body.Message+'</h2>'+
                    '<div class="exceptionGroup toggle" style="display:none;">'+
                    '<div class="exceptionResult">'+
                    '<table><thead><tr><th>File</th><th>Line</th><th>Instrucation</th></tr></thead><tbody>';

    result += '<tr>';
    result += '<td>'+this.fileShortName(log.body.File)+'</td>';
    result += '<td>'+log.body.Line+'</td>';
    result += '<td><strong>'+log.body.Type+' '+log.body.Class+'(`<span class="red">'+log.body.Message+'</span>`);</strong></td>';
    result += '</tr>';

    _.each(log.body.Trace, function(row, key) {
        result += '<tr>';
        result += '<td>'+this.fileShortName(row.file)+'</td>';
        result += '<td>'+row.line+'</td>';

        if (row['class'] === undefined) {
            result += '<td><strong>'+row['function']+'(';
        } else {
            result += '<td><strong>'+row['class']+row.type+row['function']+'(';
        }

        _.each(row.args, function(argRow, argKey) {
            if (typeof(argRow) != 'object') {
                result += argRow;
            } else {
                result += this.printObject(argRow);
            }

            if ((argKey+1) < row.args.length) {
                result += ', ';
            }
        }, this);

        result += ');</strong></td>';
        result += '</tr>';
    }, this);
    result += '</tbody></table></div></div>';

    return result;
};

WebView.prototype.traceType = function(log) {
    var result = '<h2 class="closed trace">'+log.body.Message+'</h2>'+
                 '<div class="traceGroup toggle" style="display:none;">'+
                 '<div class="traceResult">'+
                 '<table><thead><tr><th>File</th><th>Line</th><th>Instrucation</th></tr></thead><tbody>';

    result += '<tr>';
    result += '<td>'+this.fileShortName(log.body.File)+'</td>';
    result += '<td>'+log.body.Line+'</td>';

    if (log.body.Class === undefined) {
        result += '<td><strong>'+log.body.Function+'(`<span class="red">'+log.body.Args[0]+'</span>`);</strong></td>';
    } else {
        result += '<td><strong>'+log.body.Class+log.body.Type+log.body.Function+'(`<span class="red">'+log.body.Args[0]+'</span>`);</strong></td>';
    }

    result += '</tr>';

    _.each(log.body.Trace, function(row, key) {
        result += '<tr>';
        result += '<td>'+this.fileShortName(row.file)+'</td>';
        result += '<td>'+row.line+'</td>';

        if (row['class'] === undefined) {
            result += '<td><strong>'+row['function']+'(';
        } else {
            result += '<td><strong>'+row['class']+row.type+row['function']+'(';
        }

        _.each(row.args, function(argRow, argKey) {
            if (typeof(argRow) != 'object') {
                result += argRow;
            } else {
                result += this.printObject(argRow);
            }

            if ((argKey+1) < row.args.length) {
                result += ', ';
            }
        }, this);

        result += ');</strong></td>';
        result += '</tr>';
    }, this);
    result += '</tbody></table></div></div>';

    return result;
};

WebView.prototype.groupStartType = function(log) {
    var style = '';
    if (log.meta.Color) {
        style += ' style="color: '+log.meta.Color+'"';
    }


    return '<h2 class="' + (log.meta.Collapsed ? 'closed' : 'open') + '"'+style+'>'+log.meta.Label+'</h2>'+
        '<div class="group toggle"' + (log.meta.Collapsed ? ' style="display:none;"' : 'style="display:block;"') + '></div>';
};

WebView.prototype.groupEndType = function(log) {
    $('#content div.group:not(.groupEnd):last').addClass('groupEnd');
    return '';
};

WebView.prototype.generateInfobox = function(log) {
    return '<div class="infobox"><img src="/Images/comment.png" class="comment" title="<em>'+log.meta.File+'</em>: <strong>'+log.meta.Line+'</strong>"></div>';
};

WebView.prototype.printObject = function(obj) {
    var dumpedObject = this.dumpObject(obj, 1);
    var dumpedObjectStripped = _.string.trim(_.string.stripTags(dumpedObject));
    return '<span class="object">'+_.string.prune(dumpedObjectStripped, 70)+'<div id="html">'+dumpedObject+'</div></span>';
};

WebView.prototype.dumpObject = function(obj,level) {
    var result = '';
    if (!level) level = 0;

    var levelPadding = "";
    for(var j=1; j<level; j++) levelPadding += "    ";

    _.each(obj, function(value, key) {
        if (key == '__className') {
            result += levelPadding + '<strong>object</strong> '+value+"\n";
        } else {
            var classVar = false;
            var tmpKey = _.string.words(key, ":");
            if (tmpKey.length > 1) {
                if (_.intersection(['private', 'protected', 'public', 'undeclared', 'static'], tmpKey).length > 0) {
                    key = '<em>'+_.initial(tmpKey).join(" ")+'</em> \''+_.last(tmpKey)+'\'';
                    classVar = true;
                }
            }

            if (typeof(value) == 'object') {
                result += levelPadding;

                if (!classVar && _.isString(key)) {
                    result += '\''+ key +'\'';
                } else {
                    result += key;
                }

                result += ' <span style="color:#888a85">=></span>'+"\n";
                result += levelPadding + ' <strong>array</strong> '+"\n";
                result += this.dumpObject(value, level+1);
            } else {
               result += levelPadding;

               if (!classVar && _.isString(key)) {
                   result += '\''+ key +'\'';
               } else {
                   result += key;
               }

               result +=' <span style="color:#888a85">=></span> ';

               if (value == '** Excluded by Filter **') {
                   result += '<span style="color:#cc0000;">'+value+'</span>';
               } else {
                   result += '<span style="color:#75507b">'+_.string.escapeHTML(value)+'</span>';
               }

               result += "\n";
            }
        }
    }, this);

    return result;
};

WebView.prototype.fileShortName = function(file) {
    if (file === undefined || !_.isString(file)) {
        return '';
    } else {
        var result = '<abbr title="'+file+'">';

        if (file.length > 70) {
            result += '...'+file.substr(-70);
        } else {
            result += file;
        }

        result += '</abbr>';
        return result;
    }
};
