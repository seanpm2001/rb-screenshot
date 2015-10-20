var { ToggleButton } = require('sdk/ui/button/toggle');
var { Cc, Ci } = require('chrome');
var tabs = require('sdk/tabs');
var self = require('sdk/self');
var panels = require('sdk/panel');
var pageMod = require('sdk/page-mod');
var ss = require('sdk/simple-storage');

var button = ToggleButton({
    id: "reviewboard-icon",
    label: "Review Board Screenshot Tool",
    icon: {
        "16": "./images/icons/icon16.png",
        "32": "./images/icons/icon32.png",
        "64": "./images/icons/icon64.png"
    },
    onChange: handleChange
});

var panel = panels.Panel({
    height: 210,
    width: 200,
    contentURL: self.data.url("popup.html"),
    contentScriptFile: self.data.url("js/popup.js"),
    contentScriptWhen: 'ready',
    onHide: handleHide
});

pageMod.PageMod({
  include: 'chrome://rbscreenshot/content/add_user.html',
  contentScriptFile: './js/save_user.js',
  onAttach: function(worker) {
    worker.port.on('save_info', function(user_info) {
        if (ss.storage.user_info) {
            ss.storage.user_info.push({
                api_key: user_info.api_key,
                username: user_info.username,
                server: user_info.server
            });
        } else {
            ss.storage.user_info = [{
                api_key: user_info.api_key,
                username: user_info.username,
                server: user_info.server
            }];
        }
    });
  }
});

panel.port.on('capture-all-content', function() {
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
               .getService(Ci.nsIWindowMediator);
    var gBrowser = wm.getMostRecentWindow("navigator:browser").gBrowser;
    var window = gBrowser.contentWindow;
    var document = window.document;
    var canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var ctx = canvas.getContext('2d');
    ctx.drawWindow(window, 0, 0, canvas.width, canvas.height, 'rgb(255,255,255)');

    var dataUrl = canvas.toDataURL();
    canvas = null;

    // Below may need to be refactored when other screenshot features added
    var tab = gBrowser.addTab('chrome://rbscreenshot/content/screenshot.html');
    gBrowser.selectedTab = tab;
    var newTabBrowser = gBrowser.getBrowserForTab(tab);
    newTabBrowser.addEventListener("load", function() {
        newTabBrowser.contentDocument.getElementById('screenshot').src = dataUrl;
        set_listeners(newTabBrowser);
        set_servers(newTabBrowser);
    }, true);

});

function set_listeners(browser) {
    var server_dropdown = browser.contentDocument.getElementById('account-select');
    server_dropdown.addEventListener('change', function() {
        var index = server_dropdown.options[server_dropdown.selectedIndex].value;
        var user_info = ss.storage.user_info[index]
        browser.contentWindow.screenshot.reviewRequests(user_info.server, user_info.username);
    });
}

function set_servers(browser) {
    var server_dropdown = browser.contentDocument.getElementById('account-select');
    var user_info = ss.storage.user_info;
    if (user_info) {
        for (var i = 0; i < user_info.length; i++) {
            var option = browser.contentDocument.createElement('option');
            option.value = i;
            option.text = user_info[i].server;
            server_dropdown.add(option);
        }
    }
}

function handleChange(state) {
    if(state.checked) {
        panel.show({
            position: button
        });
    }
}

function handleHide() {
    button.state('window', {checked: false});
}