/**
 * Show IP Address main.
 */
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Mainloop = imports.mainloop;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Soup = imports.gi.Soup;

const ICON_SIZE = 16;

const SETTINGS_COMPACT_MODE = 'compact-mode';
const SETTINGS_REFRESH_RATE = 'refresh-rate';
const SETTINGS_POSITION = 'position-in-panel';

function _getIP(callback) {

    let _httpSession = new Soup.SessionAsync();
    Soup.Session.prototype.add_feature.call(_httpSession,new Soup.ProxyResolverDefault());

    var request = Soup.Message.new('GET', 'https://api.ipify.org/?format=json');

    _httpSession.queue_message(request, function(_httpSession, message) {
        if (message.status_code !== 200) {
            callback(message.status_code, null);
            return;
        }

        var ipAddr = JSON.parse(request.response_body.data);
        if (ipAddr.ip) {
            request    = Soup.Message.new('GET', 'http://ipinfo.io/' + ipAddr.ip + '/json');

            _httpSession.queue_message(request, function(_httpSession, message) {
                if (message.status_code !== 200) {
                    callback(message.status_code, null);
                    return;
                }

                var ipDetails = JSON.parse(request.response_body.data);
                callback(null, ipDetails);
            });
        }
    });

}

const DEFAULT_DATA = {
    ip: 'No Connection',
    hostname: '',
    city: '',
    region: '',
    country: '',
    loc: '',
    org: '',
};

const IPMenu = new Lang.Class({ //menu bar item
    Name: 'IPMenu.IPMenu',
    Extends: PanelMenu.Button,
    _init: function() {
        this.parent(0.0, 'IP Details');
        this._textureCache = St.TextureCache.get_default();

        this._settings = Convenience.getSettings(Me.metadata['settings-schema']);

        this.setPrefs();

        let hbox = new St.BoxLayout({style_class: 'panel-status-menu-box'});

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(Me.path + '/icons/flags/_unknown.png'),
            icon_size: ICON_SIZE
        });

        this._ipAddr = DEFAULT_DATA.ip;

        this._label = new St.Label({
            text: this._compactMode ? '' : this._ipAddr
        });

        hbox.add_child(this._icon);
        hbox.add_child(this._label);

        this._actor = this.actor.add_actor(hbox);

        //main containers
        let ipInfo = new PopupMenu.PopupBaseMenuItem({reactive: false});
        let parentContainer = new St.BoxLayout();

        //ipinfo
        let ipInfoBox = new St.BoxLayout({style_class: 'ip-info-box', vertical: true});
        parentContainer.add_actor(ipInfoBox);
        ipInfo.actor.add(parentContainer);
        this.menu.addMenuItem(ipInfo);

        Object.keys(DEFAULT_DATA).map(function(key) {
            let ipInfoRow = new St.BoxLayout();
            ipInfoBox.add_actor(ipInfoRow);
            ipInfoRow.add_actor(new St.Label({style_class: 'ip-info-key', text: key + ': '}));
            this['_' + key] = new St.Label({style_class: 'ip-info-value', text: DEFAULT_DATA[key]});
            ipInfoRow.add_actor(this['_' + key]);
        });

        this._settings.connect('changed', Lang.bind(this, function() {
            this.setPrefs();
            this.stop();
            this.start(this._refreshRate); //restarts incase refresh rate was updated
            this.resetPanelPos();
            this.update();
        }));

        Main.panel.addToStatusArea('ip-menu', this, 1, this._menuPosition);

        this.update();
        this.start(this._refreshRate);
    },

    destroy: function() {
        this.stop();
        this.parent();
    },

    start: function(timeout) {
        this.timer = Mainloop.timeout_add_seconds(timeout, Lang.bind(this, function() {
            this.update();
            return true;
        }));
    },

    stop: function() {
        if (this.timer) {
            Mainloop.source_remove(this.timer);
        }
    },

    resetPanelPos: function() {

        Main.panel.statusArea['ip-menu'] = null;
        Main.panel.addToStatusArea('ip-menu', this, 1, this._menuPosition);

    },

    setPrefs: function() {
        this._prevCompactMode = this._compactMode;
        this._prevRefreshRate = this._refreshRate;
        this._prevMenuPosition = this._menuPosition;

        this._compactMode = this._settings.get_boolean(SETTINGS_COMPACT_MODE);
        this._refreshRate = this._settings.get_int(SETTINGS_REFRESH_RATE);
        this._menuPosition = this._settings.get_string(SETTINGS_POSITION);
    },

    update: function() {

        let self = this;

        _getIP(function(err, ipData) {
            if (ipData) {
                self.ipAddr = ipData.ip;
                self._label.text = self._compactMode ? '' : ipData.ip;

                Object.keys(ipData).map(function(key) {
                    if (this['_' + key]) {
                        this['_' + key].text = ipData[key];
                    }
                });

                self._icon.gicon = Gio.icon_new_for_string(Me.path + '/icons/flags/' + ipData.country + '.png');
            }
        });
    },

});

let _indicator;

function init() {
}

function enable() {
    _indicator = new IPMenu();
}

function disable() {
    _indicator.destroy();
}
