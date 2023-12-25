/*
 *
 */
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';


import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { SettingsData } from './settings_data.js';

export default class Prefs extends ExtensionPreferences {

    fillPreferencesWindow(window) {
        const settingsData = new SettingsData(this.getSettings());

        const width = 750;
        const height = 580;
        window.set_default_size(width, height);

        const page = Adw.PreferencesPage.new();

        const group1 = Adw.PreferencesGroup.new();
        this.useDarkTheme  = this.addSwitch(group1, "Use Dark Theme (requires restart)", settingsData.darkMode);
        this.compactMode   = this.addSwitch(group1, "Hide IP Address in toolbar", settingsData.compactMode);
        this.refreshRate   = this.addSlider(group1, "Refresh Interval", settingsData.refreshRate, 1.0, 600.0, 0);
        //this.panelPosition = this.addCombo(group1, "Position in panel", settingsData.panelPosition);
        this.token         = this.addInput(group1, "API Token", settingsData.token);
        page.add(group1);

        window.add(page);
    }

    addSlider(group, labelText, settingsData, lower, upper, decimalDigits) {
        const scale = new Gtk.Scale({
            digits: decimalDigits,
            adjustment: new Gtk.Adjustment({lower: lower, upper: upper}),
            value_pos: Gtk.PositionType.RIGHT,
            hexpand: true,
            halign: Gtk.Align.END
        });
        scale.set_draw_value(true);
        scale.set_value(settingsData.get());
        scale.connect('value-changed', (sw) => {
            var newval = sw.get_value();
            if (newval != settingsData.get()) {
                settingsData.set(newval);
            }
        });
        scale.set_size_request(400, 15);

        const row = Adw.ActionRow.new();
        row.set_title(labelText);
        row.add_suffix(scale);
        group.add(row);

        return scale;
    }

    addSwitch(group, labelText, settingsData) {
        const gtkSwitch = new Gtk.Switch({hexpand: true, halign: Gtk.Align.END});
        gtkSwitch.set_active(settingsData.get());
        gtkSwitch.set_valign(Gtk.Align.CENTER);
        gtkSwitch.connect('state-set', (sw) => {
            var newval = sw.get_active();
            if (newval != settingsData.get()) {
                settingsData.set(newval);
            }
        });

        const row = Adw.ActionRow.new();
        row.set_title(labelText);
        row.add_suffix(gtkSwitch);
        group.add(row);

        return gtkSwitch;
    }

    addCombo(group, labelText, settingsData) {
        const model = new Gtk.ListStore();
        model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
        model.append(["left", "Left"]);
        model.append(["center", "Center"]);
        model.append(["right", "Right"]);
        const gtkCombo = new Gtk.ComboBox({model: model});
        gtkCombo.set_active(settingsData.get());
        gtkCombo.set_valign(Gtk.Align.CENTER);
        gtkCombo.connect('changed', (sw) => {
            let [success, iter] = sw.get_active_iter();
            if (!success) return;
            settingsData.set(model.get_value(iter, 0));
        });

        const row = Adw.ActionRow.new();
        row.set_title(labelText);
        row.add_suffix(gtkCombo);
        group.add(row);

        return gtkCombo;
    }

    addInput(group, labelText, settingsData) {
        const gtkInput = new Gtk.Entry({buffer: new Gtk.EntryBuffer()});
        gtkInput.set_text(settingsData.get());
        gtkInput.set_valign(Gtk.Align.CENTER);

        const row = Adw.ActionRow.new();
        row.set_title(labelText);
        row.add_suffix(gtkInput);
        group.add(row);

        return gtkInput;
    }

    findWidgetByType(parent, type) {
        for (const child of [...parent]) {
            if (child instanceof type) return child;

            const match = this.findWidgetByType(child, type);
            if (match) return match;
        }
        return null;
    }
}
