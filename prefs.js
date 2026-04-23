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
// Default actions — used on fresh install and by the "Reset to Defaults" button
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_ACTIONS = [
    {
        id: 'fix-grammar', name: 'Fix Grammar', hotkey: '<Control><Alt>g', enabled: true, backend: 'default',
        prompt: "You are a precise grammar and spelling correction tool. Fix all grammar, spelling, and punctuation errors in the following text. Preserve the original wording, tone, and style — only correct mistakes. Return ONLY the corrected text, with no explanation or preamble.",
    },
    {
        id: 'improve-text', name: 'Improve Text', hotkey: '<Control><Alt>i', enabled: true, backend: 'default',
        prompt: "You are an expert editor. Improve the following text for clarity, flow, and impact. Fix awkward phrasing and tighten the language while preserving the original voice and all key information. Return ONLY the improved text, with no explanation or preamble.",
    },
    {
        id: 'humanize-text', name: 'Remove AI Patterns', hotkey: '<Control><Alt>h', enabled: true, backend: 'default',
        prompt: "You are a skilled human editor who specializes in making AI-generated text sound authentically human. Rewrite the following text by doing all of the following:\n\n- Remove sycophantic and formulaic openers: \"Certainly!\", \"Of course!\", \"Great question!\", \"I would be happy to\", \"It is important to note\", \"In conclusion\", \"To summarize\"\n- Cut unnecessary hedging and filler: \"basically\", \"essentially\", \"ultimately\", \"at the end of the day\", \"it goes without saying\"\n- Replace hollow buzzwords: \"leverage\" → use, \"utilize\" → use, \"actionable\" → practical, \"seamless\" → smooth, \"robust\" → strong\n- Vary sentence length and structure so the text flows naturally\n- Convert unnecessary bullet lists back into natural prose\n- Keep every piece of factual content and the core message intact\n\nReturn ONLY the rewritten text, with no explanation or preamble.",
    },
    {
        id: 'make-professional', name: 'Make Professional', hotkey: '', enabled: true, backend: 'default',
        prompt: "Rewrite the following text in a polished, professional, and business-appropriate tone. Keep all original information intact. Return ONLY the rewritten text, with no explanation or preamble.",
    },
    {
        id: 'make-casual', name: 'Make Casual', hotkey: '', enabled: true, backend: 'default',
        prompt: "Rewrite the following text in a warm, friendly, and conversational tone — as if written to a colleague or friend. Keep the full meaning intact. Return ONLY the rewritten text, with no explanation or preamble.",
    },
    {
        id: 'fix-tone', name: 'Fix Tone', hotkey: '', enabled: true, backend: 'default',
        prompt: "Rewrite the following text to be polite, respectful, and constructive while fully preserving the intended message. Remove any aggression, frustration, or harshness. Return ONLY the rewritten text, with no explanation or preamble.",
    },
    {
        id: 'reply-message', name: 'Reply to Message / Mail', hotkey: '<Control><Alt>m', enabled: true, backend: 'default',
        prompt: "You are an expert communicator. Read the following message or email and write a complete, ready-to-send reply. Match the formality and tone of the original. Be clear, concise, and address every point raised. Do not add a subject line. Output ONLY the reply text — no introduction, no explanation, no markdown.",
    },
    {
        id: 'translate', name: 'Translate DE ↔ EN', hotkey: '<Control><Alt>t', enabled: true, backend: 'default',
        prompt: "Detect the language of the following text. If it is German, translate it to English. If it is English, translate it to German. Preserve the tone, formality, and style of the original. Return ONLY the translated text, with no explanation or preamble.",
    },
    {
        id: 'translate-pl', name: 'Translate DE ↔ PL', hotkey: '<Control><Alt>p', enabled: true, backend: 'default',
        prompt: "Detect the language of the following text. If it is German, translate it to Polish. If it is Polish, translate it to German. If the text mixes both languages, translate everything to whichever language appears less. Preserve the tone, formality, and style of the original. Return ONLY the translated text, with no explanation or preamble.",
    },
    {
        id: 'summarize', name: 'Summarize', hotkey: '', enabled: true, backend: 'default',
        prompt: "Summarize the following text into its key points. Be concise — capture the essential information while losing nothing important. Return ONLY the summary, with no introduction or explanation.",
    },
    {
        id: 'bullet-points', name: 'Bullet Points', hotkey: '', enabled: true, backend: 'default',
        prompt: "Convert the following text into a clear, well-organized bullet list. Capture every key point. Use the • character for bullets. Return ONLY the bullet list, with no introduction or explanation.",
    },
    {
        id: 'keywords-to-text', name: 'Write from Keywords', hotkey: '<Control><Alt>k', enabled: true, backend: 'default',
        prompt: "You are a skilled writer. The input below is a list of keywords, bullet points, or rough notes. Expand them into a well-structured, coherent, and natural-sounding text. Preserve all key ideas and choose an appropriate length and style based on the content. Return ONLY the written text, with no preamble or explanation.",
    },
    {
        id: 'expand-text', name: 'Expand Text', hotkey: '', enabled: true, backend: 'default',
        prompt: "Expand the following text by adding more detail, context, and depth while staying true to the original meaning and tone. Do not change the subject or add unrelated information. Return ONLY the expanded text, with no explanation or preamble.",
    },
    {
        id: 'add-emojis', name: 'Add Emojis', hotkey: '', enabled: true, backend: 'default',
        prompt: "Add relevant and fitting emojis to the following text to make it more expressive and lively. Place emojis naturally inline or at the end of sentences where they feel right. Use at most one emoji per sentence or idea. Keep all original text intact. Return ONLY the emoji-enhanced text, with no explanation or preamble.",
    },
    {
        id: 'explain-code', name: 'Explain Code', hotkey: '', enabled: true, backend: 'default',
        prompt: "You are a senior software engineer. Explain what the following code does — its purpose, how it works, and any important details or gotchas. Be clear and concise. Use markdown formatting.",
    },
    {
        id: 'refactor-code', name: 'Refactor Code', hotkey: '', enabled: true, backend: 'default',
        prompt: "You are an expert software engineer. Refactor the following code to be cleaner, more readable, and more efficient. Preserve the exact behavior. Output ONLY the refactored code, without markdown code blocks or any explanation.",
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isCliInstalled(cliPath) {
    if (!cliPath || cliPath.trim() === '') return false;
    if (cliPath.startsWith('/')) return GLib.file_test(cliPath, GLib.FileTest.IS_EXECUTABLE);
    return GLib.find_program_in_path(cliPath) !== null;
}

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
            icon_name: 'applications-science-symbolic',
        });

        // ── Active backend chooser ──
        const backendGroup = new Adw.PreferencesGroup({
            title: 'Active AI Backend',
            description: 'Choose which AI backend to use for all actions (can be overridden per-action).',
        });
        page.add(backendGroup);

        const backendRow = new Adw.ComboRow({
            title: 'Backend',
            model: new Gtk.StringList({ strings: ['Local API', 'Gemini CLI', 'Claude CLI', 'Copilot CLI'] }),
        });
        const backendKeys = ['local', 'gemini-cli', 'claude-cli', 'copilot-cli'];
        const currentBackend = settings.get_string('backend');
        backendRow.set_selected(Math.max(0, backendKeys.indexOf(currentBackend)));
        backendRow.connect('notify::selected', () => {
            settings.set_string('backend', backendKeys[backendRow.get_selected()]);
        });
        backendGroup.add(backendRow);

        // ── Local API ──
        const localGroup = new Adw.PreferencesGroup({
            title: 'Local API',
            description: 'Ollama, LM Studio, or any OpenAI-compatible endpoint.',
        });
        page.add(localGroup);
        localGroup.add(makeEntry('API Endpoint', settings, 'api-endpoint'));
        localGroup.add(this._makeLocalModelEntry(settings));
        localGroup.add(makePasswordEntry('API Key', settings, 'api-key'));

        // ── Gemini CLI ──
        this._makeCliGroup(page, settings, {
            title: 'Gemini CLI',
            description: 'Requires the Google Gemini CLI installed and authenticated.',
            pathKey: 'gemini-cli-path',
            modelTitle: 'Gemini Model',
            modelKey: 'gemini-model',
            presets: [
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
                'gemini-1.5-flash-8b',
            ],
            downloadUrl: 'https://github.com/google-gemini/gemini-cli',
        });

        // ── Claude CLI ──
        this._makeCliGroup(page, settings, {
            title: 'Claude CLI',
            description: 'Requires Claude Code CLI ("claude") installed and authenticated.',
            pathKey: 'claude-cli-path',
            modelTitle: 'Claude Model',
            modelKey: 'claude-model',
            presets: [
                'Default (Auto)',
                'claude-3-7-sonnet-20250219',
                'claude-3-5-sonnet-20241022',
                'claude-3-5-haiku-20241022',
                'claude-3-opus-20240229',
                'claude-sonnet-4-6',
                'claude-opus-4-6',
                'claude-haiku-4-5-20251001',
            ],
            downloadUrl: 'https://claude.ai/code',
        });

        // ── Copilot CLI ──
        this._makeCliGroup(page, settings, {
            title: 'Copilot CLI',
            description: 'Requires GitHub Copilot CLI ("copilot") installed and authenticated.',
            pathKey: 'copilot-cli-path',
            modelTitle: 'Copilot Model',
            modelKey: 'copilot-model',
            presets: [
                'Default (Auto)',
                'gpt-4o',
                'claude-3.5-sonnet',
                'gpt-4',
                'gpt-3.5-turbo',
            ],
            downloadUrl: 'https://github.com/github/copilot-cli',
        });

        return page;
    }

    _makeCliGroup(page, settings, { title, description, pathKey, modelTitle, modelKey, presets, downloadUrl }) {
        const group = new Adw.PreferencesGroup({ title, description });
        page.add(group);

        // Status row
        const statusIcon = new Gtk.Image({ pixel_size: 16, valign: Gtk.Align.CENTER });
        const statusRow = new Adw.ActionRow({ activatable: false });
        statusRow.add_prefix(statusIcon);

        const downloadBtn = new Gtk.Button({
            label: 'Download',
            valign: Gtk.Align.CENTER,
            css_classes: ['suggested-action'],
            tooltip_text: `Open download/install page for ${title}`,
        });
        downloadBtn.connect('clicked', () => {
            try { Gtk.show_uri(null, downloadUrl, GLib.CURRENT_TIME); }
            catch (e) { console.warn('[LLM Text Pro] Could not open URL:', e.message); }
        });
        statusRow.add_suffix(downloadBtn);
        group.add(statusRow);

        // Path entry — always editable so the user can fix a wrong path
        const pathRow = makeEntry('CLI Binary Path', settings, pathKey);
        group.add(pathRow);

        // Model entry — grayed out when CLI is not found
        const modelRow = this._makeModelEntryWithPresets(modelTitle, settings, modelKey, presets);
        group.add(modelRow);

        const refresh = () => {
            const path = settings.get_string(pathKey);
            const found = isCliInstalled(path);
            const resolvedPath = found
                ? (path.startsWith('/') ? path : (GLib.find_program_in_path(path) || path))
                : null;

            statusRow.set_title(found ? 'Installed' : 'Not Installed');
            statusRow.set_subtitle(found
                ? `Found: ${resolvedPath}`
                : 'Binary not found on PATH — install and authenticate first');
            statusIcon.set_from_icon_name(found ? 'emblem-ok-symbolic' : 'dialog-warning-symbolic');
            downloadBtn.set_visible(!found);
            modelRow.set_sensitive(found);
        };

        settings.connect(`changed::${pathKey}`, refresh);
        refresh();

        return group;
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
            icon_name: 'document-edit-symbolic',
        });

        this._actionsSettings = settings;
        this._actionsWindow   = window;
        this._actionRowMap    = new Map(); // action.id → { widget, chipsBox }

        const css = new Gtk.CssProvider();
        css.load_from_string(
            '.llm-new-row{animation:llm-in 200ms ease-out both;}' +
            '@keyframes llm-in{from{opacity:0;margin-top:-8px}to{opacity:1;margin-top:0}}' +
            '.llm-row-disabled .title{opacity:0.45;}' +
            '.llm-row-disabled .subtitle{opacity:0.3;}' +
            '.llm-chip{font-size:0.72em;font-family:monospace;padding:1px 6px;border-radius:4px;' +
            'background-color:alpha(currentColor,0.1);}'
        );
        Gtk.StyleContext.add_provider_for_display(
            window.get_display(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        );

        this._actionsListGroup = new Adw.PreferencesGroup({ title: 'Text Actions' });
        page.add(this._actionsListGroup);

        const actions = this._parseActions(settings);
        this._updateGroupHeader(actions);
        actions.forEach(a => this._appendActionRowWidget(a, false));

        // ── Buttons ──
        const btnGroup = new Adw.PreferencesGroup();
        page.add(btnGroup);

        const addRow = new Adw.ButtonRow({ title: 'Add New Action', start_icon_name: 'list-add-symbolic' });
        addRow.add_css_class('suggested-action');
        addRow.connect('activated', () => this._openActionDialog(null));
        btnGroup.add(addRow);

        const resetRow = new Adw.ButtonRow({ title: 'Reset to Defaults', start_icon_name: 'document-revert-symbolic' });
        resetRow.add_css_class('destructive-action');
        resetRow.connect('activated', () => {
            const dlg = new Adw.AlertDialog({
                heading: 'Reset to Default Actions?',
                body: 'All current actions will be replaced with the built-in defaults. Any custom changes will be permanently lost.',
            });
            dlg.add_response('cancel', 'Cancel');
            dlg.add_response('reset', 'Reset');
            dlg.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);
            dlg.connect('response', (_d, resp) => {
                if (resp === 'reset') {
                    settings.set_string('actions-json', JSON.stringify(DEFAULT_ACTIONS));
                    this._fullRebuildActionsUI();
                }
            });
            dlg.present(window);
        });
        btnGroup.add(resetRow);

        return page;
    }

    _updateGroupHeader(actions) {
        const total   = actions.length;
        const enabled = actions.filter(a => a.enabled).length;
        this._actionsListGroup.set_description(
            `${enabled} of ${total} enabled — click any row to edit`
        );
    }

    _appendActionRowWidget(action, animate = false) {
        const widget = this._makeActionRow(action);
        if (animate) widget.add_css_class('llm-new-row');
        this._actionsListGroup.add(widget);
        this._actionRowMap.set(action.id, { widget, chipsBox: widget._chipsBox });
    }

    _fullRebuildActionsUI() {
        this._actionRowMap.forEach(ref => {
            try { this._actionsListGroup.remove(ref.widget); } catch (_) {}
        });
        this._actionRowMap.clear();
        const actions = this._parseActions(this._actionsSettings);
        this._updateGroupHeader(actions);
        actions.forEach(a => this._appendActionRowWidget(a, false));
    }

    _makeRowSubtitle(action) {
        const preview = (action.prompt || '')
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!preview) return 'No prompt set';
        return preview.length > 90 ? preview.substring(0, 87) + '…' : preview;
    }

    _getGroupListBox(group) {
        const search = (widget, depth) => {
            if (!widget || depth > 3) return null;
            if (widget instanceof Gtk.ListBox) return widget;
            let child = widget.get_first_child?.();
            while (child) {
                const found = search(child, depth + 1);
                if (found) return found;
                child = child.get_next_sibling?.();
            }
            return null;
        };
        return search(group, 0);
    }

    _getIconForAction(action) {
        const idMap = {
            'fix-grammar':       'tools-check-spelling-symbolic',
            'improve-text':      'go-up-symbolic',
            'humanize-text':     'user-available-symbolic',
            'make-professional': 'mail-send-symbolic',
            'make-casual':       'face-smile-symbolic',
            'fix-tone':          'dialog-information-symbolic',
            'reply-message':     'mail-reply-sender-symbolic',
            'translate':         'accessories-dictionary-symbolic',
            'translate-pl':      'accessories-dictionary-symbolic',
            'summarize':         'document-properties-symbolic',
            'bullet-points':     'view-list-bullet-symbolic',
            'keywords-to-text':  'document-new-symbolic',
            'expand-text':       'list-add-symbolic',
            'add-emojis':        'face-wink-symbolic',
            'explain-code':      'dialog-question-symbolic',
            'refactor-code':     'utilities-terminal-symbolic',
        };
        if (action.id && idMap[action.id]) return idMap[action.id];
        const name = (action.name || '').toLowerCase();
        if (name.includes('grammar') || name.includes('spell')) return 'tools-check-spelling-symbolic';
        if (name.includes('translat'))   return 'accessories-dictionary-symbolic';
        if (name.includes('code') || name.includes('refactor')) return 'utilities-terminal-symbolic';
        if (name.includes('reply') || name.includes('mail'))    return 'mail-reply-sender-symbolic';
        if (name.includes('emoji'))      return 'face-wink-symbolic';
        return 'document-edit-symbolic';
    }

    _rebuildChips(box, action) {
        let c = box.get_first_child();
        while (c) { const n = c.get_next_sibling(); box.remove(c); c = n; }
        if (action.hotkey) {
            box.append(new Gtk.Label({
                label: action.hotkey,
                css_classes: ['llm-chip', 'dim-label'],
                valign: Gtk.Align.CENTER,
            }));
        }
        if (action.backend && action.backend !== 'default') {
            box.append(new Gtk.Label({
                label: action.backend.replace('-cli', ''),
                css_classes: ['llm-chip'],
                valign: Gtk.Align.CENTER,
            }));
        }
    }

    _makeActionRow(action) {
        const row = new Adw.ActionRow({
            title: action.name,
            subtitle: this._makeRowSubtitle(action),
            activatable: true,
        });
        if (!action.enabled) row.add_css_class('llm-row-disabled');

        row.add_prefix(new Gtk.Image({
            icon_name: this._getIconForAction(action),
            pixel_size: 16,
            css_classes: ['dim-label'],
            valign: Gtk.Align.CENTER,
        }));

        // Hotkey / backend chips
        const chipsBox = new Gtk.Box({ valign: Gtk.Align.CENTER, spacing: 4 });
        this._rebuildChips(chipsBox, action);
        row.add_suffix(chipsBox);
        row._chipsBox = chipsBox;

        // Enable/disable toggle
        const toggle = new Gtk.Switch({ valign: Gtk.Align.CENTER, active: action.enabled });
        toggle.connect('notify::active', () => {
            action.enabled = toggle.get_active();
            if (action.enabled) row.remove_css_class('llm-row-disabled');
            else                row.add_css_class('llm-row-disabled');
            const acts = this._parseActions(this._actionsSettings);
            const i = acts.findIndex(a => a.id === action.id);
            if (i >= 0) {
                acts[i].enabled = action.enabled;
                this._actionsSettings.set_string('actions-json', JSON.stringify(acts));
            }
            this._updateGroupHeader(this._parseActions(this._actionsSettings));
        });
        row.add_suffix(toggle);

        row.add_suffix(new Gtk.Image({
            icon_name: 'go-next-symbolic',
            pixel_size: 16,
            css_classes: ['dim-label'],
            valign: Gtk.Align.CENTER,
        }));

        row.connect('activated', () => this._openActionDialog(action.id));
        return row;
    }

    _reorderRowWidget(actionId, fromIndex, toIndex) {
        const ref = this._actionRowMap.get(actionId);
        if (!ref) return;
        const lb = this._getGroupListBox(this._actionsListGroup);
        if (!lb) return;
        lb.remove(ref.widget);
        lb.insert(ref.widget, toIndex);
    }

    _openActionDialog(actionId) {
        const settings    = this._actionsSettings;
        const isNew       = actionId === null || actionId === undefined;
        const acts        = this._parseActions(settings);
        const actionIndex = isNew ? -1 : acts.findIndex(a => a.id === actionId);
        const action      = isNew
            ? { id: `custom-${Date.now()}`, name: '', prompt: 'Transform the following text. Return ONLY the result, with no explanation or preamble.', hotkey: '', enabled: true, backend: 'default' }
            : { ...acts[actionIndex] };

        const dialog = new Adw.Dialog({
            title: isNew ? 'New Action' : 'Edit Action',
            content_width: 540,
            content_height: 680,
        });

        const toolbarView = new Adw.ToolbarView();
        dialog.set_child(toolbarView);

        const hbar = new Adw.HeaderBar();
        toolbarView.add_top_bar(hbar);

        const cancelBtn = new Gtk.Button({ label: 'Cancel' });
        cancelBtn.connect('clicked', () => dialog.close());
        hbar.pack_start(cancelBtn);

        const saveBtn = new Gtk.Button({
            label: isNew ? 'Add' : 'Save',
            css_classes: ['suggested-action'],
        });
        hbar.pack_end(saveBtn);

        const scroll = new Gtk.ScrolledWindow({
            vexpand: true,
            hscrollbar_policy: Gtk.PolicyType.NEVER,
        });
        toolbarView.set_content(scroll);

        const body = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
            margin_start: 12,
            margin_end: 12,
            margin_top: 12,
            margin_bottom: 24,
        });
        scroll.set_child(body);

        // ── Settings group ──
        const settingsGroup = new Adw.PreferencesGroup({ title: 'Settings' });
        body.append(settingsGroup);

        const nameRow = new Adw.EntryRow({ title: 'Name', text: action.name });
        settingsGroup.add(nameRow);

        const hotkeyRow = new Adw.EntryRow({ title: 'Hotkey', text: action.hotkey || '' });
        hotkeyRow.add_suffix(new Gtk.Image({
            icon_name: 'dialog-question-symbolic',
            pixel_size: 14,
            css_classes: ['dim-label'],
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Format: <Control><Alt>g  or  <Shift><Super>t\nLeave blank to disable the hotkey.',
        }));
        settingsGroup.add(hotkeyRow);

        const enabledRow = new Adw.SwitchRow({
            title: 'Enabled',
            subtitle: 'Show in tray menu and respond to hotkey',
            active: action.enabled,
        });
        settingsGroup.add(enabledRow);

        const backendRow = new Adw.ComboRow({
            title: 'Backend',
            subtitle: 'Override the global backend for this action only',
            model: new Gtk.StringList({ strings: ['Default (global)', 'Local API', 'Gemini CLI', 'Claude CLI', 'Copilot CLI'] }),
        });
        const bkKeys = ['default', 'local', 'gemini-cli', 'claude-cli', 'copilot-cli'];
        backendRow.set_selected(Math.max(0, bkKeys.indexOf(action.backend || 'default')));
        settingsGroup.add(backendRow);

        // ── Reorder row (existing actions only) ──
        if (!isNew && acts.length > 1) {
            let curIndex = actionIndex;
            const posRow = new Adw.ActionRow({
                title: 'Position in Menu',
                subtitle: `${curIndex + 1} of ${acts.length}`,
                activatable: false,
            });

            const upBtn = new Gtk.Button({
                icon_name: 'go-up-symbolic',
                tooltip_text: 'Move earlier in menu',
                valign: Gtk.Align.CENTER,
                sensitive: curIndex > 0,
                css_classes: ['flat'],
            });
            const downBtn = new Gtk.Button({
                icon_name: 'go-down-symbolic',
                tooltip_text: 'Move later in menu',
                valign: Gtk.Align.CENTER,
                sensitive: curIndex < acts.length - 1,
                css_classes: ['flat'],
            });

            upBtn.connect('clicked', () => {
                const cur = this._parseActions(settings);
                const i = cur.findIndex(a => a.id === action.id);
                if (i <= 0) return;
                [cur[i], cur[i - 1]] = [cur[i - 1], cur[i]];
                settings.set_string('actions-json', JSON.stringify(cur));
                this._reorderRowWidget(action.id, i, i - 1);
                curIndex = i - 1;
                posRow.set_subtitle(`${curIndex + 1} of ${cur.length}`);
                upBtn.set_sensitive(curIndex > 0);
                downBtn.set_sensitive(true);
            });

            downBtn.connect('clicked', () => {
                const cur = this._parseActions(settings);
                const i = cur.findIndex(a => a.id === action.id);
                if (i >= cur.length - 1) return;
                [cur[i], cur[i + 1]] = [cur[i + 1], cur[i]];
                settings.set_string('actions-json', JSON.stringify(cur));
                this._reorderRowWidget(action.id, i, i + 1);
                curIndex = i + 1;
                posRow.set_subtitle(`${curIndex + 1} of ${cur.length}`);
                upBtn.set_sensitive(true);
                downBtn.set_sensitive(curIndex < cur.length - 1);
            });

            const moveBox = new Gtk.Box({ css_classes: ['linked'], valign: Gtk.Align.CENTER });
            moveBox.append(upBtn);
            moveBox.append(downBtn);
            posRow.add_suffix(moveBox);
            settingsGroup.add(posRow);
        }

        // ── Prompt section ──
        const promptSection = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8 });
        body.append(promptSection);

        const promptHeader = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 2, margin_start: 6 });
        promptHeader.append(new Gtk.Label({
            label: 'System Prompt',
            halign: Gtk.Align.START,
            css_classes: ['title-4'],
        }));
        promptHeader.append(new Gtk.Label({
            label: 'Instructions sent to the AI together with the clipboard text.',
            halign: Gtk.Align.START,
            wrap: true,
            css_classes: ['dim-label', 'caption'],
        }));
        promptSection.append(promptHeader);

        const buffer = new Gtk.TextBuffer();
        buffer.set_text(action.prompt || '', -1);

        const textView = new Gtk.TextView({
            buffer,
            wrap_mode: Gtk.WrapMode.WORD_CHAR,
            accepts_tab: false,
            top_margin: 10,
            bottom_margin: 10,
            left_margin: 12,
            right_margin: 12,
        });

        const promptCard = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            css_classes: ['card'],
            overflow: Gtk.Overflow.HIDDEN,
        });
        promptCard.append(new Gtk.ScrolledWindow({
            child: textView,
            vexpand: true,
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            height_request: 230,
        }));
        promptSection.append(promptCard);

        // ── Delete zone (existing actions only) ──
        if (!isNew) {
            const dangerGroup = new Adw.PreferencesGroup();
            body.append(dangerGroup);

            const delRow = new Adw.ButtonRow({ title: 'Delete Action', start_icon_name: 'user-trash-symbolic' });
            delRow.add_css_class('destructive-action');
            delRow.connect('activated', () => {
                const confirm = new Adw.AlertDialog({
                    heading: 'Delete Action?',
                    body: `"${action.name}" will be permanently removed.`,
                });
                confirm.add_response('cancel', 'Cancel');
                confirm.add_response('delete', 'Delete');
                confirm.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);
                confirm.connect('response', (_d, resp) => {
                    if (resp !== 'delete') return;
                    dialog.close();
                    const cur = this._parseActions(settings);
                    const i = cur.findIndex(a => a.id === action.id);
                    if (i >= 0) cur.splice(i, 1);
                    settings.set_string('actions-json', JSON.stringify(cur));
                    // Remove the row surgically — no scroll reset
                    const ref = this._actionRowMap.get(action.id);
                    if (ref) {
                        this._actionsListGroup.remove(ref.widget);
                        this._actionRowMap.delete(action.id);
                    }
                    this._updateGroupHeader(cur);
                });
                confirm.present(dialog);
            });
            dangerGroup.add(delRow);
        }

        // ── Save handler ──
        saveBtn.connect('clicked', () => {
            const name = nameRow.get_text().trim();
            if (!name) {
                nameRow.add_css_class('error');
                nameRow.grab_focus();
                return;
            }
            nameRow.remove_css_class('error');
            const [s, e] = buffer.get_bounds();
            action.name    = name;
            action.hotkey  = hotkeyRow.get_text().trim();
            action.enabled = enabledRow.get_active();
            action.backend = bkKeys[backendRow.get_selected()];
            action.prompt  = buffer.get_text(s, e, false);

            const cur = this._parseActions(settings);
            if (isNew) {
                cur.push(action);
                settings.set_string('actions-json', JSON.stringify(cur));
                this._appendActionRowWidget(action, true); // animate new row
            } else {
                const i = cur.findIndex(a => a.id === action.id);
                if (i >= 0) cur[i] = action;
                settings.set_string('actions-json', JSON.stringify(cur));
                // Update existing row in-place — no scroll reset
                const ref = this._actionRowMap.get(action.id);
                if (ref) {
                    ref.widget.set_title(action.name);
                    ref.widget.set_subtitle(this._makeRowSubtitle(action));
                    if (action.enabled) ref.widget.remove_css_class('llm-row-disabled');
                    else                ref.widget.add_css_class('llm-row-disabled');
                    this._rebuildChips(ref.chipsBox, action);
                }
            }
            this._updateGroupHeader(this._parseActions(settings));
            dialog.close();
        });

        dialog.present(this._actionsWindow);
    }

    _parseActions(settings) {
        try { return JSON.parse(settings.get_string('actions-json')); }
        catch (_) { return []; }
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

        apiGroup.add(makeSwitchRow(
            'Auto-Start LM Studio',
            'If your Local API connection fails, automatically attempt to launch the LM Studio server in the background.',
            settings,
            'auto-start-lms'
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
            subtitle: 'v11 — Built by David Sokolowski\nBased on "LLM Text Modifier" by Rishabh Bajpai',
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
                'Local API: Start Ollama (ollama serve) or LM Studio, then set the endpoint to http://127.0.0.1:11434/v1/chat/completions (Ollama) or http://127.0.0.1:1234/v1/chat/completions (LM Studio).\n\n' +
                'Gemini CLI: Install via  npm install -g @google/gemini-cli  then run  gemini  once to authenticate.\n\n' +
                'Claude CLI: Install Claude Code from https://claude.ai/code then run  claude  once to authenticate.\n\n' +
                'Copilot CLI: Use GitHub Copilot CLI via  copilot  (experimental).',
        });
        page.add(backendGroup);

        return page;
    }
}
