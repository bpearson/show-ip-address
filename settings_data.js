
export class SettingsData {
    constructor(settings) {
        this.compactMode = {
            key: 'compact-mode',
            get: function () { return settings.get_boolean(this.key); },
            set: function (v) { settings.set_boolean(this.key, v); }
        };

        this.darkMode = {
            key: 'dark-mode',
            get: function () { return settings.get_boolean(this.key); },
            set: function (v) { settings.set_boolean(this.key, v); }
        };

        this.refreshRate = {
            key: 'refresh-rate',
            get: function () { return settings.get_double(this.key); },
            set: function (v) { settings.set_double(this.key, v); }
        };

        this.panelPosition = {
            key: 'position-in-panel',
            get: function () { return settings.get_string(this.key); },
            set: function (v) { settings.set_string(this.key, v); }
        };

        this.token = {
            key: 'token',
            get: function () { return settings.get_string(this.key); },
            set: function (v) { settings.set_string(this.key, v); }
        };
    }
}
