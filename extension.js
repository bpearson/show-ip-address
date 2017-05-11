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

const ICON_SIZE = 20;
const FLAG_SIZE = 100;
const UNKNOWN_SIZE = 40;

const SETTINGS_DARK_MODE = 'dark-mode';
const SETTINGS_COMPACT_MODE = 'compact-mode';
const SETTINGS_REFRESH_RATE = 'refresh-rate';
const SETTINGS_POSITION = 'position-in-panel';

const DEFAULT_DATA = {
    ip:           null,
    country_code: '',
    country_name: '',
    region_code:  '',
    city:         '',
    zip_code:     '',
    time_zone:    '',
    latitude:     '',
    longitude:    '',
};

const LABEL_DATA = {
    ip:           'IP',
    country_code: 'Country Code',
    country_name: 'Country',
    region_code:  'Region',
    city:         'City',
    zip_code:     'Postcode',
    time_zone:    'Timezone',
    latitude:     'Latitude',
    longitude:    'Longitude',
};

const SHOW_INFO = ['ip', 'country_name', 'city', 'time_zone', 'latitude', 'longitude'];

const IPMenu = new Lang.Class({
    Name: 'IPMenu.IPMenu',

    Extends: PanelMenu.Button,

    _init: function() {
        this.parent(0.0, 'IP Details');
        this._textureCache = St.TextureCache.get_default();

        this._settings = Convenience.getSettings(Me.metadata['settings-schema']);

        this.setPrefs();
        if (this._darkMode === true) {
            mainClass = 'panel-status-menu-box-dark';
            boxClass  = 'ip-info-box-dark';
        } else {
            mainClass = 'panel-status-menu-box';
            boxClass  = 'ip-info-box';
        }

        let hbox = new St.BoxLayout({style_class: mainClass});

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(Me.path + '/icons/unknown.svg'),
            icon_size: ICON_SIZE
        });

        this._ipAddr = DEFAULT_DATA.ip;

        this._label = new St.Label({
            text: this.getPanelText(),
        });

        hbox.add_child(this._icon);
        hbox.add_child(this._label);

        this._actor = this.actor.add_actor(hbox);

        let ipInfo = new PopupMenu.PopupBaseMenuItem({reactive: false});
        let parentContainer = new St.BoxLayout();

        // Display the flag on the popup.
        this._flagContainer = new St.BoxLayout({style_class: 'ip-info-flag'});
        parentContainer.add_actor(this._flagContainer);
        let scaleFactor  = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        this._flagTile = new St.Icon({
          gicon: Gio.icon_new_for_string(Me.path + '/icons/unknown.svg'),
          icon_size: UNKNOWN_SIZE
        });
        this._flagContainer.add_actor(this._flagTile);

        this._ipInfoBox = new St.BoxLayout({style_class: boxClass, vertical: true});
        parentContainer.add_actor(this._ipInfoBox);
        ipInfo.actor.add(parentContainer);
        this.menu.addMenuItem(ipInfo);
        this.updateDetails(DEFAULT_DATA);
        this._settings.connect('changed', Lang.bind(this, function() {
            this.setPrefs();
            this.stop();
            this.start(this._refreshRate);
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
        this._prevDarkMode = this._darkMode;
        this._prevCompactMode = this._compactMode;
        this._prevRefreshRate = this._refreshRate;
        this._prevMenuPosition = this._menuPosition;

        this._darkMode = this._settings.get_boolean(SETTINGS_DARK_MODE);
        this._compactMode = this._settings.get_boolean(SETTINGS_COMPACT_MODE);
        this._refreshRate = this._settings.get_int(SETTINGS_REFRESH_RATE);
        this._menuPosition = this._settings.get_string(SETTINGS_POSITION);
    },

    getPanelText: function() {
        return this._compactMode ? '' : (this._ipAddr == null ? 'Not Connected' : this._ipAddr);
    },

    update: function() {

        let self = this;

        _getIP(function(err, ipData) {
            if (ipData !== null && ipData.ip !== null) {
                self._ipAddr     = ipData.ip;
                self._label.text = String(self.getPanelText());
                self.updateDetails(ipData);

                let scaleFactor  = St.ThemeContext.get_for_stage(global.stage).scale_factor;
                self._icon.gicon = Gio.icon_new_for_string(Me.path + '/icons/flags/' + ipData['country_code'].toLowerCase() + '.svg');
                self._flagContainer.destroy_all_children();
                self._flagContainer.add_child(
                    self._textureCache.load_file_async(Gio.file_new_for_path(Me.path + '/icons/flags/' + ipData['country_code'].toLowerCase() + '.svg'), -1, FLAG_SIZE, scaleFactor)
                );
            } else {
                self._ipAddr     = DEFAULT_DATA.ip;
                self._label.text = String(self.getPanelText());
                self.updateDetails(DEFAULT_DATA);

                let scaleFactor  = St.ThemeContext.get_for_stage(global.stage).scale_factor;
                self._icon.gicon = Gio.icon_new_for_string(Me.path + '/icons/unknown.svg');
                self._flagContainer.destroy_all_children();
                self._flagContainer.add_child(
                    self._textureCache.load_file_async(Gio.file_new_for_path(Me.path + '/icons/unknown.svg'), -1, UNKNOWN_SIZE, scaleFactor)
                );
            }
        });
    },

    updateDetails: function(data) {
        let self = this;
        if (this._ipAddr !== null) {
            this._ipInfoBox.destroy_all_children();
            SHOW_INFO.map(function(key) {
                if (data[key]) {
                    let ipInfoRow = new St.BoxLayout();
                    self._ipInfoBox.add_actor(ipInfoRow);
                    ipInfoRow.add_actor(new St.Label({style_class: 'ip-info-key', text: String(LABEL_DATA[key] + ': ')}));
                    ipInfoRow.add_actor(new St.Label({style_class: 'ip-info-value', text: String(data[key])}));
                }
            });
        } else {
            this._ipInfoBox.destroy_all_children();
            let ipNotConnected = new St.BoxLayout();
            this._ipInfoBox.add_actor(ipNotConnected);
            ipNotConnected.add_actor(new St.Label({style_class: 'ip-not-connected', text: 'Not Connected'}));
        }
    },

});

let indicator;


/**
 * Go get the IP data.
 *
 * @param callback callback The function to run when the data is obtained.
 *
 * @return void
 */
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
            request = Soup.Message.new('GET', 'https://geoip.nekudo.com/api/' + ipAddr.ip + '/en/json');

            _httpSession.queue_message(request, function(_httpSession, message) {
                if (message.status_code !== 200) {
                    callback(message.status_code, null);
                    return;
                }

                var ipDetails = JSON.parse(request.response_body.data);
                if (ipDetails['country']['name']) {
                    ipDetails['country_code'] = ipDetails['country']['code'];
                    ipDetails['country_name'] = ipDetails['country']['name'];
                }

                if (ipDetails['location']) {
                    if (ipDetails['location']['latitude']) {
                        ipDetails['latitude'] = ipDetails['location']['latitude'];
                    }

                    if (ipDetails['location']['longitude']) {
                        ipDetails['longitude'] = ipDetails['location']['longitude'];
                    }

                    if (ipDetails['location']['time_zone']) {
                        ipDetails['time_zone'] = ipDetails['location']['time_zone'];
                    }
                }

                callback(null, ipDetails);
            });
        }
    });

}


/**
 * Initialise.
 *
 * @return void
 */
function init() {

}


/**
 * Enable this extension.
 *
 * @return void
 */
function enable() {
    indicator = new IPMenu();
}


/**
 * Disable this extension.
 *
 * @return void
 */
function disable() {
    indicator.destroy();
}
