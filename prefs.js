/**
 * LLM Text Pro — prefs.js
 * Multi-page preferences: Backend selection, CLI / API config,
 * dynamic Actions editor, and General settings.
 */

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Soup from 'gi://Soup';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeEntry(text, settings, key) {
    const row = new Adw.EntryRow({ title: text, text: settings.get_string(key) });
    row.connect('notify::text', () => settings.set_string(key, row.get_text()));
    return row;
}

function makePasswordEntry(text, settings, key) {
    const row = new Adw.PasswordEntryRow({ title: text, text: settings.get_string(key) });
    row.connect('notify::text', () => settings.set_string(key, row.get_text()));
    return row;
}

function makeSwitchRow(title, subtitle, settings, key) {
    const row = new Adw.SwitchRow({ title, subtitle });
    row.set_active(settings.get_boolean(key));
    row.connect('notify::active', () => settings.set_boolean(key, row.get_active()));
    return row;
}

function makeSpinRow(title, subtitle, settings, key, min, max) {
    const row = new Adw.SpinRow({
        title,
        subtitle,
        adjustment: new Gtk.Adjustment({
            lower: min,
            upper: max,
            step_increment: 1,
            value: settings.get_int(key),
        }),
    });
    row.connect('notify::value', () => settings.set_int(key, row.get_value()));
    return row;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Preferences Window
// ─────────────────────────────────────────────────────────────────────────────

export default class LLMTextProPreferences extends ExtensionPreferences {

    fillPreferencesWindow(window) {
        window.set_default_size(720, 640);
        const settings = this.getSettings();

        window.add(this._buildBackendPage(settings));
        window.add(this._buildActionsPage(settings, window));
        window.add(this._buildGeneralPage(settings));
        window.add(this._buildAboutPage());
    }

    // ── Page: Backend ────────────────────────────────────────────────────────

    _buildBackendPage(settings) {
        const page = new Adw.PreferencesPage({
            title: 'Backend',
            icon_name: 'network-server-symbolic',
        });

        // ── Active backend chooser ──
        const backendGroup = new Adw.PreferencesGroup({
            title: 'Active AI Backend',
            description: 'Choose which AI backend to use for all actions (can be overridden per-action).',
        });
        page.add(backendGroup);

        const backendRow = new Adw.ComboRow({
            title: 'Backend',
            model: new Gtk.StringList({ strings: ['Local API', 'Gemini CLI', 'Claude CLI'] }),
        });
        const backendKeys = ['local', 'gemini-cli', 'claude-cli'];
        const currentBackend = settings.get_string('backend');
        backendRow.set_selected(Math.max(0, backendKeys.indexOf(currentBackend)));
        backendRow.connect('notify::selected', () => {
            settings.set_string('backend', backendKeys[backendRow.get_selected()]);
        });
        backendGroup.add(backendRow);

        // ── Local API ──
        const localGroup = new Adw.PreferencesGroup({
            title: '🖥  Local API  (Ollama / LM Studio / OpenAI-compatible)',
        });
        page.add(localGroup);
        localGroup.add(makeEntry('API Endpoint', settings, 'api-endpoint'));
        localGroup.add(this._makeLocalModelEntry(settings));
        localGroup.add(makePasswordEntry('API Key', settings, 'api-key'));

        // ── Gemini CLI ──
        const geminiGroup = new Adw.PreferencesGroup({
            title: '🔷  Gemini CLI',
            description: 'Requires the Google Gemini CLI installed and authenticated.',
        });
        page.add(geminiGroup);
        geminiGroup.add(makeEntry('CLI Binary Path', settings, 'gemini-cli-path'));
        geminiGroup.add(this._makeModelEntryWithPresets(
            'Gemini Model',
            settings,
            'gemini-model',
            [
                'Default (Auto)',
                'gemini-3.1-pro-preview',
                'gemini-3.0-flash-preview',
                'gemini-2.5-pro',
                'gemini-2.5-flash',
                'gemini-2.0-pro-exp-02-05',
                'gemini-2.0-flash',
                'gemini-2.0-flash-lite',
                'gemini-1.5-pro',
                'gemini-1.5-flash',
                'gemini-1.5-flash-8b'
            ]
        ));

        // ── Claude CLI ──
        const claudeGroup = new Adw.PreferencesGroup({
            title: '🤖  Claude CLI',
            description: 'Requires Claude Code CLI ("claude") installed and authenticated.',
        });
        page.add(claudeGroup);
        claudeGroup.add(makeEntry('CLI Binary Path', settings, 'claude-cli-path'));
        claudeGroup.add(this._makeModelEntryWithPresets(
            'Claude Model',
            settings,
            'claude-model',
            [
                'Default (Auto)',
                'claude-3-7-sonnet-20250219',
                'claude-3-5-sonnet-20241022',
                'claude-3-5-haiku-20241022',
                'claude-3-opus-20240229',
                'claude-sonnet-4-6',
                'claude-opus-4-6',
                'claude-haiku-4-5-20251001'
            ]
        ));

        return page;
    }

    _makeLocalModelEntry(settings) {
        const row = new Adw.EntryRow({ title: 'Model Name', text: settings.get_string('local-model') });
        row.connect('notify::text', () => settings.set_string('local-model', row.get_text()));

        const fetchBtn = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Fetch available models from Local API'
        });
        
        const popover = new Gtk.Popover();
        const listBox = new Gtk.ListBox({ selection_mode: Gtk.SelectionMode.NONE });
        const scroll = new Gtk.ScrolledWindow({ max_content_height: 300, propagate_natural_height: true });
        scroll.set_size_request(350, -1);
        scroll.set_child(listBox);
        popover.set_child(scroll);

        fetchBtn.connect('clicked', async () => {
            fetchBtn.set_icon_name('system-run-symbolic');
            try {
                let endpoint = settings.get_string('api-endpoint');
                // Usually endpoint ends with /chat/completions or /v1/chat/completions
                let url = endpoint;
                if (url.endsWith('/chat/completions')) {
                    url = url.replace('/chat/completions', '/models');
                } else if (!url.endsWith('/models')) {
                    if (!url.endsWith('/')) url += '/';
                    url += 'models';
                }

                const session = new Soup.Session();
                const msg = Soup.Message.new('GET', url);
                
                const apiKey = settings.get_string('api-key');
                if (apiKey && apiKey !== 'random' && apiKey.trim() !== '') {
                    msg.request_headers.append('Authorization', `Bearer ${apiKey}`);
                }

                const bytes = await new Promise((resolve, reject) => {
                    session.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (s, res) => {
                        try {
                            const b = s.send_and_read_finish(res);
                            resolve(b);
                        } catch (e) {
                            reject(e);
                        }
                    });
                });

                if (msg.get_status() !== 200) {
                    throw new Error(`HTTP ${msg.get_status()}`);
                }

                const json = JSON.parse(new TextDecoder().decode(bytes.get_data()));
                const models = (json.data || []).map(m => m.id);

                // clear list
                let child = listBox.get_first_child();
                while (child) {
                    const next = child.get_next_sibling();
                    listBox.remove(child);
                    child = next;
                }

                if (models.length === 0) {
                    const l = new Gtk.Label({ label: 'No models found', margin_top: 10, margin_bottom: 10, margin_start: 10, margin_end: 10 });
                    listBox.append(l);
                } else {
                    models.forEach(m => {
                        const label = new Gtk.Label({ label: m, halign: Gtk.Align.START });
                        const btn = new Gtk.Button({ child: label, has_frame: false });
                        btn.connect('clicked', () => {
                            row.set_text(m);
                            popover.popdown();
                        });
                        listBox.append(btn);
                    });
                }
                
                popover.set_parent(fetchBtn);
                popover.popup();
                fetchBtn.set_icon_name('view-refresh-symbolic');
            } catch (e) {
                console.warn('[LLM Text Pro] Fetch Models error:', e.message);
                fetchBtn.set_icon_name('dialog-error-symbolic');
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                    fetchBtn.set_icon_name('view-refresh-symbolic');
                    return GLib.SOURCE_REMOVE;
                });
            }
        });

        row.add_suffix(fetchBtn);
        return row;
    }

    _makeModelEntryWithPresets(title, settings, key, presets) {
        const row = new Adw.EntryRow({ title, text: settings.get_string(key) });
        row.connect('notify::text', () => settings.set_string(key, row.get_text()));

        const popover = new Gtk.Popover();
        const listBox = new Gtk.ListBox({ selection_mode: Gtk.SelectionMode.NONE });
        const scroll = new Gtk.ScrolledWindow({ max_content_height: 300, propagate_natural_height: true });
        scroll.set_size_request(350, -1);
        scroll.set_child(listBox);
        popover.set_child(scroll);

        presets.forEach(p => {
            const label = new Gtk.Label({ label: p, halign: Gtk.Align.START });
            const btn = new Gtk.Button({ child: label, has_frame: false });
            btn.connect('clicked', () => {
                row.set_text(p);
                popover.popdown();
            });
            listBox.append(btn);
        });

        const presetBtn = new Gtk.MenuButton({
            icon_name: 'pan-down-symbolic',
            valign: Gtk.Align.CENTER,
            popover: popover,
            tooltip_text: 'Choose predefined model'
        });

        row.add_suffix(presetBtn);
        return row;
    }

    // ── Page: Actions ────────────────────────────────────────────────────────

    _buildActionsPage(settings, window) {
        const page = new Adw.PreferencesPage({
            title: 'Actions',
            icon_name: 'applications-utilities-symbolic',
        });

        const topGroup = new Adw.PreferencesGroup({
            title: 'Text Actions',
            description: 'Each action runs an AI prompt on your clipboard text. Enable/disable, edit prompts, set hotkeys, and choose the backend per-action.',
        });
        page.add(topGroup);

        // Container that holds one expander-row per action
        this._actionsGroup = topGroup;
        this._settings = settings;
        this._window = window;
        this._rebuildActionsUI(settings, topGroup);

        // ── Add Action button ──
        const addGroup = new Adw.PreferencesGroup();
        page.add(addGroup);
        const addRow = new Adw.ButtonRow({ title: '+ Add New Action', start_icon_name: 'list-add-symbolic' });
        addRow.add_css_class('suggested-action');
        addRow.connect('activated', () => {
            this._showActionEditor(settings, null, () => this._rebuildActionsUI(settings, topGroup));
        });
        addGroup.add(addRow);

        return page;
    }

    _rebuildActionsUI(settings, group) {
        // Remove all existing action rows (keep only the first description-like item)
        const children = [];
        let child = group.get_first_child();
        while (child) {
            children.push(child);
            child = child.get_next_sibling();
        }
        // We rebuild by using Adw.ActionRow widgets tagged with a marker
        // Actually, since Adw.PreferencesGroup doesn't have a clean remove_all,
        // we'll re-add everything to a fresh group. A simpler approach:
        // Store action rows in an array and use a Gtk.ListBox inside the group.

        // For simplicity we use ExpanderRow per action and track them manually
        // by clearing child widgets via the group's internal list box.
        const listBox = this._getGroupListBox(group);
        if (listBox) {
            let row = listBox.get_first_child();
            while (row) {
                const next = row.get_next_sibling();
                // Only remove rows we added (not the header row the Adw group adds)
                if (row._llmActionRow) listBox.remove(row);
                row = next;
            }
        }

        const actions = this._parseActions(settings);
        actions.forEach((action, index) => {
            const expRow = this._makeActionRow(action, index, settings, group);
            expRow._llmActionRow = true;
            group.add(expRow);
        });
    }

    _getGroupListBox(group) {
        // Adw.PreferencesGroup contains a GtkBox > GtkListBox internally
        let child = group.get_first_child();
        while (child) {
            if (child.constructor?.name === 'GtkListBox' || child instanceof Gtk.ListBox) {
                return child;
            }
            // Check children of child
            let inner = child.get_first_child?.();
            while (inner) {
                if (inner instanceof Gtk.ListBox) return inner;
                inner = inner.get_next_sibling?.();
            }
            child = child.get_next_sibling();
        }
        return null;
    }

    _makeActionRow(action, index, settings, parentGroup) {
        const expRow = new Adw.ExpanderRow({
            title: action.name,
            subtitle: action.hotkey || 'No hotkey',
            show_enable_switch: true,
            enable_expansion: action.enabled,
        });
        expRow.connect('notify::enable-expansion', () => {
            action.enabled = expRow.get_enable_expansion();
            this._saveAction(settings, action, index);
        });

        // ── Name entry ──
        const nameRow = new Adw.EntryRow({ title: 'Action Name', text: action.name });
        nameRow.connect('notify::text', () => {
            action.name = nameRow.get_text();
            expRow.set_title(action.name);
            this._saveAction(settings, action, index);
        });
        expRow.add_row(nameRow);

        // ── Hotkey entry ──
        const hotkeyRow = new Adw.EntryRow({
            title: 'Hotkey',
            text: action.hotkey || '',
        });
        const hotkeyHint = new Adw.ActionRow({
            title: '',
            subtitle: 'Format: <Control><Super>o  ·  Leave blank to disable.',
            selectable: false,
            activatable: false,
        });
        hotkeyRow.connect('notify::text', () => {
            action.hotkey = hotkeyRow.get_text().trim();
            expRow.set_subtitle(action.hotkey || 'No hotkey');
            this._saveAction(settings, action, index);
        });
        expRow.add_row(hotkeyRow);
        expRow.add_row(hotkeyHint);

        // ── Backend override ──
        const backendRow = new Adw.ComboRow({
            title: 'Backend',
            subtitle: 'Override the global backend for this action.',
            model: new Gtk.StringList({ strings: ['Default (global)', 'Local API', 'Gemini CLI', 'Claude CLI'] }),
        });
        const bkKeys = ['default', 'local', 'gemini-cli', 'claude-cli'];
        backendRow.set_selected(Math.max(0, bkKeys.indexOf(action.backend || 'default')));
        backendRow.connect('notify::selected', () => {
            action.backend = bkKeys[backendRow.get_selected()];
            this._saveAction(settings, action, index);
        });
        expRow.add_row(backendRow);

        // ── Prompt editor ──
        const promptExpRow = new Adw.ExpanderRow({ title: 'System Prompt', subtitle: 'Click to edit' });
        const buffer = new Gtk.TextBuffer();
        buffer.set_text(action.prompt, -1);
        buffer.connect('changed', () => {
            const [s, e] = buffer.get_bounds();
            action.prompt = buffer.get_text(s, e, false);
            this._saveAction(settings, action, index);
        });
        const textView = new Gtk.TextView({
            buffer,
            wrap_mode: Gtk.WrapMode.WORD_CHAR,
            vexpand: true,
            hexpand: true,
            height_request: 120,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 12,
            margin_end: 12,
        });
        const scrolled = new Gtk.ScrolledWindow({
            child: textView,
            has_frame: false,
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            height_request: 130,
        });
        promptExpRow.add_row(scrolled);
        expRow.add_row(promptExpRow);

        // ── Delete button ──
        const deleteRow = new Adw.ButtonRow({
            title: 'Delete This Action',
            start_icon_name: 'user-trash-symbolic',
        });
        deleteRow.add_css_class('destructive-action');
        deleteRow.connect('activated', () => {
            const actions = this._parseActions(settings);
            actions.splice(index, 1);
            settings.set_string('actions-json', JSON.stringify(actions));
            this._rebuildActionsUI(settings, parentGroup);
        });
        expRow.add_row(deleteRow);

        return expRow;
    }

    _showActionEditor(settings, action, onSave) {
        // For adding new actions, use a dialog approach
        const isNew = !action;
        if (isNew) {
            action = {
                id: `custom-${Date.now()}`,
                name: 'New Action',
                prompt: 'Transform the following text. Return *only* the result, with no explanation or markdown.',
                hotkey: '',
                enabled: true,
                backend: 'default',
            };
            const actions = this._parseActions(settings);
            actions.push(action);
            settings.set_string('actions-json', JSON.stringify(actions));
            onSave?.();
        }
    }

    _parseActions(settings) {
        try {
            return JSON.parse(settings.get_string('actions-json'));
        } catch (_) {
            return [];
        }
    }

    _saveAction(settings, updatedAction, index) {
        const actions = this._parseActions(settings);
        if (index >= 0 && index < actions.length) {
            actions[index] = updatedAction;
            settings.set_string('actions-json', JSON.stringify(actions));
        }
    }

    // ── Page: General ────────────────────────────────────────────────────────

    _buildGeneralPage(settings) {
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });

        // ── Quota & API ──
        const apiGroup = new Adw.PreferencesGroup({ 
            title: 'Quota & API Monitoring',
            description: 'Settings related to the background API health and quota checks.'
        });
        page.add(apiGroup);

        apiGroup.add(makeSwitchRow(
            'Periodic Quota Check',
            'Silently ping the active CLI API every 5 minutes to update the Quota usage percentage in the tray menu. (Turn off to save API calls)',
            settings,
            'auto-check-quota'
        ));

        // ── UI & Behaviour ──
        const behavGroup = new Adw.PreferencesGroup({ 
            title: 'UI & Behaviour',
            description: 'Configure how the extension interacts with your desktop.'
        });
        page.add(behavGroup);

        behavGroup.add(makeSwitchRow(
            'Auto-paste Result',
            'Automatically simulate Ctrl+V to paste the processed text back into the active window.',
            settings,
            'auto-paste'
        ));
        behavGroup.add(makeSwitchRow(
            'Show Desktop Notifications',
            'Display GNOME notifications when processing starts, finishes, or encounters an error.',
            settings,
            'show-notifications'
        ));

        // ── History ──
        const histGroup = new Adw.PreferencesGroup({ 
            title: 'History Management',
            description: 'Settings for the clipboard transformation history.'
        });
        page.add(histGroup);
        histGroup.add(makeSpinRow(
            'Maximum History Size',
            'Number of past transformations to keep accessible from the tray menu.',
            settings,
            'history-size',
            0,
            50
        ));

        return page;
    }

    // ── Page: About ──────────────────────────────────────────────────────────

    _buildAboutPage() {
        const page = new Adw.PreferencesPage({
            title: 'About',
            icon_name: 'help-about-symbolic',
        });

        const group = new Adw.PreferencesGroup({ title: 'LLM Text Pro' });
        page.add(group);

        const infoRow = new Adw.ActionRow({
            title: 'LLM Text Pro',
            subtitle: 'v10 — Built by David Sokolowski\nBased on "LLM Text Modifier" by Rishabh Bajpai',
            selectable: false,
        });
        group.add(infoRow);

        const tipsGroup = new Adw.PreferencesGroup({
            title: 'Tips',
            description:
                '• Copy text first, then trigger a hotkey or click the tray icon.\n' +
                '• Enable "Auto-paste" to have the result inserted immediately.\n' +
                '• Each action can use a different backend — useful to send sensitive text to a local LLM only.\n' +
                '• Hotkey format: <Control><Super>o  or  <Shift><Alt>t  etc.\n' +
                '• The "Translate DE↔EN" action auto-detects language; edit its prompt to support other languages.\n' +
                '• History is accessible from the tray icon — click any entry to re-copy it.',
        });
        page.add(tipsGroup);

        const backendGroup = new Adw.PreferencesGroup({
            title: 'Backend Setup',
            description:
                '🖥 Local API: Start Ollama (ollama serve) or LM Studio, then set the endpoint to http://127.0.0.1:11434/v1/chat/completions (Ollama) or http://127.0.0.1:1234/v1/chat/completions (LM Studio).\n\n' +
                '🔷 Gemini CLI: Install via  npm install -g @google/gemini-cli  then run  gemini  once to authenticate.\n\n' +
                '🤖 Claude CLI: Install Claude Code from https://claude.ai/code then run  claude  once to authenticate.',
        });
        page.add(backendGroup);

        return page;
    }
}
