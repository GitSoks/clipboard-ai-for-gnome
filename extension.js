/**
 * LLM Text Pro — extension.js
 * Enhanced text-modifier with animated tray icon, multiple AI backends,
 * dynamic hotkeys, auto-paste, history, and fully customisable actions.
 */

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Soup from 'gi://Soup';
import Clutter from 'gi://Clutter';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function _timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)   return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

function _formatTimestamp(ts) {
    const d   = new Date(ts);
    const now = new Date();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return time;
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + time;
}

function _wc(text) {
    return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function _friendlyError(msg) {
    if (!msg) return 'An unknown error occurred.';
    const m = msg.toLowerCase();
    if (m.includes('empty') && m.includes('clipboard'))
        return 'Clipboard is empty — copy some text first.';
    if (m.includes('empty result') || m.includes('empty response'))
        return 'AI returned an empty response — try rephrasing your input.';
    if (m.includes('429') || m.includes('quota') || m.includes('capacity'))
        return 'API quota exceeded — try again later or switch to a different backend.';
    if (m.includes('401') || m.includes('403') || m.includes('api key') || m.includes('unauthorized'))
        return 'Authentication failed — check your API key in Settings.';
    if (m.includes('timeout') || m.includes('unreachable') || m.includes('offline') || m.includes('econnrefused'))
        return 'Backend is unreachable — is the service running?';
    if (m.includes('not found') && m.includes('cli'))
        return 'CLI binary not found — check the path in Settings → Backend.';
    return msg.length > 140 ? msg.substring(0, 137) + '…' : msg;
}

function cliIsInstalled(cliPath) {
    if (!cliPath || cliPath.trim() === '') return false;
    if (cliPath.startsWith('/')) return GLib.file_test(cliPath, GLib.FileTest.IS_EXECUTABLE);
    return GLib.find_program_in_path(cliPath) !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Tray Indicator
// ─────────────────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const TextProIndicator = GObject.registerClass(
class TextProIndicator extends PanelMenu.Button {

    _init(extension) {
        super._init(0.0, 'LLM Text Pro');
        this._ext = extension;

        const box = new St.BoxLayout({ vertical: false, style_class: 'panel-status-indicators-box' });

        // Main panel icon — changes icon_name + color class based on state
        this._panelIcon = new St.Icon({
            icon_name: 'document-edit-symbolic',
            style_class: 'system-status-icon llm-panel-icon',
        });
        box.add_child(this._panelIcon);

        // Spinner label — visible ONLY during processing
        this._iconLabel = new St.Label({
            text: SPINNER_FRAMES[0],
            style_class: 'llm-text-pro-icon llm-processing',
            y_align: Clutter.ActorAlign.CENTER,
            visible: false,
        });
        box.add_child(this._iconLabel);

        this.add_child(box);

        this._animTimer = null;
        this._resetTimer = null;
        this._quotaTimer = null;
        this._lastResultFull = null;

        this._buildMenu();

        this._setupQuotaTimer();

        this._ext._settings.connect('changed::auto-check-quota', () => {
            this._setupQuotaTimer();
        });
    }

    _setupQuotaTimer() {
        if (this._quotaTimer !== null) {
            GLib.source_remove(this._quotaTimer);
            this._quotaTimer = null;
        }

        // Always show current stats from in-memory usage on init
        this._updateQuotaDisplay();

        const enabled = this._ext._settings.get_boolean('auto-check-quota');
        if (enabled) {
            this._quotaTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300000, () => {
                this._checkQuota(true);
                return GLib.SOURCE_CONTINUE;
            });
            this._checkQuota(true);
        }
    }

    // ── Menu construction ────────────────────────────────────────────────────

    _buildMenu() {
        this._statusItem = new PopupMenu.PopupImageMenuItem('Ready', 'dialog-information-symbolic', { reactive: false });
        this._statusItem.label.style_class = 'llm-status-label';
        this.menu.addMenuItem(this._statusItem);

        // Result preview — shown after a successful action; hidden otherwise
        this._resultPreviewItem = new PopupMenu.PopupBaseMenuItem({ reactive: true });
        this._resultPreviewItem.visible = false;

        const rbox = new St.BoxLayout({ vertical: true, x_expand: true, style_class: 'llm-result-box' });

        const rHeader = new St.BoxLayout({ vertical: false, x_expand: true });
        rHeader.add_child(new St.Icon({
            icon_name: 'object-select-symbolic',
            icon_size: 11,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'llm-result-icon',
        }));
        this._resultActionLabel = new St.Label({
            text: '',
            style_class: 'llm-result-action-label',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        rHeader.add_child(this._resultActionLabel);
        rHeader.add_child(new St.Label({
            text: 'click to copy',
            style_class: 'llm-result-copy-hint',
            y_align: Clutter.ActorAlign.CENTER,
        }));
        rbox.add_child(rHeader);

        this._resultTextLabel = new St.Label({
            text: '',
            style_class: 'llm-result-text',
            x_expand: true,
        });
        this._resultTextLabel.clutter_text.line_wrap = true;
        rbox.add_child(this._resultTextLabel);

        this._resultPreviewItem.add_child(rbox);
        this._resultPreviewItem.connect('activate', () => {
            if (!this._lastResultFull) return;
            const clipboard = St.Clipboard.get_default();
            clipboard.set_text(St.ClipboardType.CLIPBOARD, this._lastResultFull);
            Main.notify('LLM Text Pro', 'Result copied to clipboard.');
        });
        this.menu.addMenuItem(this._resultPreviewItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Backend switcher
        this._backendBoxItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });

        const backendContainerOuter = new St.BoxLayout({ vertical: false, x_expand: true });

        const backendLabel = new St.Label({
            text: 'Backend',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'llm-backend-title',
            x_expand: true,
        });
        backendContainerOuter.add_child(backendLabel);

        this._backendSwitchBox = new St.BoxLayout({
            vertical: false,
            style_class: 'llm-backend-switch-container',
        });
        backendContainerOuter.add_child(this._backendSwitchBox);

        this._backendBoxItem.add_child(backendContainerOuter);
        this.menu.addMenuItem(this._backendBoxItem);

        // Quota / connection status
        this._quotaItem = new PopupMenu.PopupImageMenuItem('Connection: Unknown — click to check', 'network-wired-symbolic');
        this._quotaItem.connect('activate', () => {
            this._checkQuota(false);
        });
        this.menu.addMenuItem(this._quotaItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Dynamic action items
        this._actionsSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._actionsSection);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // History sub-menu
        this._historyMenu = new PopupMenu.PopupSubMenuMenuItem('Transformation History');
        if (this._historyMenu.icon) this._historyMenu.icon.icon_name = 'document-open-recent-symbolic';
        this.menu.addMenuItem(this._historyMenu);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Settings
        const settingsItem = new PopupMenu.PopupImageMenuItem('Extension Settings', 'preferences-system-symbolic');
        settingsItem.connect('activate', () => this._ext.openPreferences());
        this.menu.addMenuItem(settingsItem);

        this.menu.connect('open-state-changed', (menu, open) => {
            if (open) {
                this._rebuildBackendMenu();
                this._rebuildActionItems();
                this._rebuildHistory();
                this._updateStatusInfo();
                this._updateQuotaDisplay();
            }
        });

        this._updateStatusInfo();
        this._rebuildBackendMenu();
    }

    _updateStatusInfo() {
        const backend = this._ext._settings.get_string('backend');
        let info = 'Ready';
        if (backend === 'local') {
            const model = this._ext._settings.get_string('local-model');
            info = `Local — ${model}`;
        } else if (backend === 'gemini-cli') {
            const model = this._ext._settings.get_string('gemini-model');
            info = `Gemini — ${model}`;
        } else if (backend === 'claude-cli') {
            const model = this._ext._settings.get_string('claude-model');
            info = `Claude — ${model}`;
        } else if (backend === 'copilot-cli') {
            const model = this._ext._settings.get_string('copilot-model');
            info = `Copilot — ${model}`;
        }

        // Only update status text when not actively spinning
        if (!this._iconLabel.visible) {
            this._statusItem.label.text = info;
        }
    }

    _rebuildBackendMenu() {
        this._backendSwitchBox.destroy_all_children();
        const s = this._ext._settings;
        let current = s.get_string('backend');

        const backends = [
            { id: 'local',       name: 'Local',   cliPath: null },
            { id: 'gemini-cli',  name: 'Gemini',  cliPath: s.get_string('gemini-cli-path') },
            { id: 'claude-cli',  name: 'Claude',  cliPath: s.get_string('claude-cli-path') },
            { id: 'copilot-cli', name: 'Copilot', cliPath: s.get_string('copilot-cli-path') },
        ];

        // Auto-switch to local if the current CLI backend is not installed
        const cur = backends.find(b => b.id === current);
        if (cur && cur.cliPath !== null && !cliIsInstalled(cur.cliPath)) {
            s.set_string('backend', 'local');
            current = 'local';
        }

        backends.forEach(b => {
            // Skip CLI backends that are not installed
            if (b.cliPath !== null && !cliIsInstalled(b.cliPath)) return;

            const btn = new St.Button({
                label: b.name,
                style_class: b.id === current
                    ? 'llm-backend-btn llm-backend-btn-active'
                    : 'llm-backend-btn',
                can_focus: true,
                reactive: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            btn.connect('clicked', () => {
                this._ext._settings.set_string('backend', b.id);
                this._rebuildBackendMenu();
                this._updateStatusInfo();
                this._checkQuota(true);
            });
            this._backendSwitchBox.add_child(btn);
        });
    }

    async _checkQuota(silent = false) {
        const backend = this._ext._settings.get_string('backend');

        // CLI backends: show today's accumulated usage — no live call to avoid cost
        if (backend !== 'local') {
            this._updateQuotaDisplay();
            if (!silent) this.setDone('Usage stats refreshed');
            return;
        }

        // Local backend: HTTP connectivity ping
        if (!silent) this.setProcessing('Checking API…');
        this._quotaItem.label.text = 'Local AI: Checking…';
        try {
            let endpoint = this._ext._settings.get_string('api-endpoint');
            let url = endpoint;
            if (url.endsWith('/chat/completions')) {
                url = url.replace('/chat/completions', '/models');
            } else if (!url.endsWith('/models')) {
                if (!url.endsWith('/')) url += '/';
                url += 'models';
            }

            const session = new Soup.Session();
            const msg = Soup.Message.new('GET', url);

            const apiKey = this._ext._settings.get_string('api-key');
            if (apiKey && apiKey !== 'random' && apiKey.trim() !== '') {
                msg.request_headers.append('Authorization', `Bearer ${apiKey}`);
            }

            const bytes = await new Promise((resolve, reject) => {
                session.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (s, res) => {
                    try { resolve(s.send_and_read_finish(res)); }
                    catch (e) { reject(e); }
                });
            });

            if (msg.get_status() !== 200) throw new Error(`HTTP ${msg.get_status()}`);

            const json = JSON.parse(new TextDecoder().decode(bytes.get_data()));
            const models = (json.data || []);

            if (models.length === 0) {
                this._quotaItem.label.text = 'Local AI: Online (no model loaded)';
            } else {
                const activeModel = models[0].id.split('/').pop();
                let infoStr = `Local AI: Online — ${activeModel}`;
                if (models[0].size) {
                    const sizeGB = (models[0].size / 1e9).toFixed(1);
                    infoStr += ` (${sizeGB} GB)`;
                }
                this._quotaItem.label.text = infoStr;
                if (!this._iconLabel.visible) {
                    this._statusItem.label.text = `Local — ${activeModel}`;
                }
            }
            if (!silent) this.setDone('Local API OK');
        } catch (e) {
            this._quotaItem.label.text = 'Local AI: Offline / unreachable';
            if (!silent) this.setError('Local API offline');
        }
    }

    _updateQuotaDisplay() {
        const backend = this._ext._settings.get_string('backend');
        const usage   = this._ext._usage;

        if (backend === 'local') {
            if (!this._quotaItem.label.text.startsWith('Local AI:')) {
                this._quotaItem.label.text = 'Local AI: Click to check connection';
            }
            return;
        }

        if (!usage) {
            this._quotaItem.label.text = 'Usage: No data yet';
            return;
        }

        if (backend === 'claude-cli') {
            const u = usage.claude;
            if (u.calls === 0) {
                this._quotaItem.label.text = 'Claude: No usage today';
            } else {
                const cost = u.costUsd >= 0.0001 ? `$${u.costUsd.toFixed(4)}` : '<$0.001';
                const tokens = u.inputTokens + u.outputTokens;
                const tokStr = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K tok` : `${tokens} tok`;
                const calls  = `${u.calls} call${u.calls !== 1 ? 's' : ''}`;
                this._quotaItem.label.text = `Claude: ${cost} · ${tokStr} · ${calls} today`;
            }
        } else if (backend === 'copilot-cli') {
            const u = usage.copilot;
            if (u.calls === 0) {
                this._quotaItem.label.text = 'Copilot: No usage today';
            } else {
                const prem  = `${u.premiumRequests} premium req`;
                const calls = `${u.calls} call${u.calls !== 1 ? 's' : ''}`;
                this._quotaItem.label.text = `Copilot: ${prem} · ${calls} today`;
            }
        } else if (backend === 'gemini-cli') {
            const u = usage.gemini;
            if (u.calls === 0) {
                this._quotaItem.label.text = 'Gemini: No usage today';
            } else {
                const tokStr = u.totalTokens >= 1000
                    ? `${(u.totalTokens / 1000).toFixed(1)}K tok`
                    : `${u.totalTokens} tok`;
                const calls = `${u.calls} call${u.calls !== 1 ? 's' : ''}`;
                this._quotaItem.label.text = `Gemini: ${tokStr} · ${calls} today`;
            }
        }
    }

    // ── Smart action icon selection ──────────────────────────────────────────

    _getActionIcon(action) {
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

        // Fallback for user-created actions: name-based matching
        const name = (action.name || '').toLowerCase();
        if (name.includes('grammar') || name.includes('spell') || name.includes('correct'))
            return 'tools-check-spelling-symbolic';
        if (name.includes('translat'))
            return 'accessories-dictionary-symbolic';
        if (name.includes('improve') || name.includes('enhance') || name.includes('refine'))
            return 'go-up-symbolic';
        if (name.includes('summar') || name.includes('concis') || name.includes('shorten'))
            return 'document-properties-symbolic';
        if (name.includes('professional') || name.includes('formal') || name.includes('business'))
            return 'mail-send-symbolic';
        if (name.includes('expand') || name.includes('elaborat') || name.includes('detail'))
            return 'list-add-symbolic';
        if (name.includes('code') || name.includes('program') || name.includes('script') || name.includes('refactor'))
            return 'utilities-terminal-symbolic';
        if (name.includes('casual') || name.includes('friendly'))
            return 'face-smile-symbolic';
        if (name.includes('reply') || name.includes('mail') || name.includes('message'))
            return 'mail-reply-sender-symbolic';
        if (name.includes('emoji') || name.includes('fun'))
            return 'face-wink-symbolic';
        if (name.includes('keyword') || name.includes('write') || name.includes('draft'))
            return 'document-new-symbolic';
        if (name.includes('bullet') || name.includes('list'))
            return 'view-list-bullet-symbolic';
        if (name.includes('human') || name.includes('ai pattern') || name.includes('tone'))
            return 'user-available-symbolic';
        if (name.includes('explain') || name.includes('simplif'))
            return 'dialog-question-symbolic';
        return 'document-edit-symbolic';
    }

    _rebuildActionItems() {
        this._actionsSection.removeAll();
        const actions = this._ext._getActions();
        const enabled = actions.filter(a => a.enabled);

        if (enabled.length === 0) {
            const none = new PopupMenu.PopupMenuItem('No actions enabled', { reactive: false });
            this._actionsSection.addMenuItem(none);
            return;
        }

        enabled.forEach(action => {
            const item = new PopupMenu.PopupImageMenuItem(action.name, this._getActionIcon(action));
            if (action.hotkey) {
                item.add_child(new St.Label({
                    text: action.hotkey,
                    style_class: 'llm-hotkey-hint',
                    x_align: Clutter.ActorAlign.END,
                    x_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                }));
            }
            item.connect('activate', () => {
                this.menu.close();
                this._ext._processClipboard(action);
            });
            this._actionsSection.addMenuItem(item);
        });
    }

    _rebuildHistory() {
        this._historyMenu.menu.removeAll();
        const history = this._ext._history;

        if (!history || history.length === 0) {
            this._historyMenu.label.text = 'History';
            const none = new PopupMenu.PopupMenuItem('No history yet', { reactive: false });
            this._historyMenu.menu.addMenuItem(none);
            return;
        }

        this._historyMenu.label.text = `History (${history.length})`;

        [...history].reverse().forEach(entry => {
            const item = new PopupMenu.PopupBaseMenuItem();

            const hbox = new St.BoxLayout({ vertical: false, x_expand: true });

            // Action-specific icon
            hbox.add_child(new St.Icon({
                icon_name: this._getActionIcon({ id: entry.actionId, name: entry.actionName }),
                icon_size: 14,
                y_align: Clutter.ActorAlign.START,
                style_class: 'llm-hist-entry-icon',
            }));

            // Content column
            const vbox = new St.BoxLayout({ vertical: true, x_expand: true });

            // Header: action name + precise timestamp
            const topRow = new St.BoxLayout({ vertical: false, x_expand: true });
            topRow.add_child(new St.Label({
                text: entry.actionName,
                style_class: 'llm-hist-action',
                x_expand: true,
            }));
            topRow.add_child(new St.Label({
                text: _formatTimestamp(entry.timestamp),
                style_class: 'llm-hist-time',
            }));
            vbox.add_child(topRow);

            // Result preview — 90 chars
            const preview = (entry.result || '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
            vbox.add_child(new St.Label({
                text: preview.length > 90 ? preview.substring(0, 88) + '…' : preview,
                style_class: 'llm-hist-preview',
            }));

            // Meta: backend · model · words in→out · duration · tokens
            const modelRaw = (entry.modelInfo || '').split('\n')[0].replace('Model: ', '');
            const model    = (modelRaw && modelRaw !== 'Default (Auto)') ? modelRaw.split('/').pop() : null;
            const bk       = (entry.backend || '').replace('-cli', '') || null;
            const wordInfo = (entry.inputWords != null && entry.resultWords != null)
                ? `${entry.inputWords}→${entry.resultWords}w`
                : null;
            const durInfo  = entry.durationMs != null
                ? `${(entry.durationMs / 1000).toFixed(1)}s`
                : null;
            const tokMatch = (entry.modelInfo || '').match(/Tokens:\s*(\d+)/);
            const tokInfo  = tokMatch ? `${tokMatch[1]}tok` : null;

            const metaParts = [bk, model, wordInfo, durInfo, tokInfo].filter(Boolean);
            if (metaParts.length > 0) {
                vbox.add_child(new St.Label({
                    text: metaParts.join(' · '),
                    style_class: 'llm-hist-meta',
                }));
            }

            hbox.add_child(vbox);

            // Per-entry delete button
            const delBtn = new St.Button({
                child: new St.Icon({ icon_name: 'window-close-symbolic', icon_size: 10 }),
                style_class: 'llm-hist-del-btn',
                y_align: Clutter.ActorAlign.CENTER,
            });
            delBtn.connect('button-press-event', () => Clutter.EVENT_STOP);
            delBtn.connect('clicked', () => {
                const i = this._ext._history.findIndex(e => e.timestamp === entry.timestamp);
                if (i >= 0) {
                    this._ext._history.splice(i, 1);
                    this._ext._saveHistory();
                    this._rebuildHistory();
                }
            });
            hbox.add_child(delBtn);

            item.add_child(hbox);

            item.connect('activate', () => {
                const clipboard = St.Clipboard.get_default();
                clipboard.set_text(St.ClipboardType.CLIPBOARD, entry.result);
                if (this._ext._settings.get_boolean('auto-paste')) {
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 80, () => {
                        this._ext._simulatePaste();
                        return GLib.SOURCE_REMOVE;
                    });
                }
                const wc = entry.resultWords ?? _wc(entry.result);
                Main.notify('LLM Text Pro', `Copied "${entry.actionName}" result — ${wc} words`);
            });
            this._historyMenu.menu.addMenuItem(item);
        });

        this._historyMenu.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const clearItem = new PopupMenu.PopupImageMenuItem('Clear All History', 'user-trash-symbolic');
        clearItem.connect('activate', () => {
            this._ext._history = [];
            this._ext._saveHistory();
            this._rebuildHistory();
        });
        this._historyMenu.menu.addMenuItem(clearItem);
    }

    // ── State setters ────────────────────────────────────────────────────────

    setProcessing(actionName) {
        this._cancelResetTimer();
        if (this._resultPreviewItem) this._resultPreviewItem.visible = false;
        this._panelIcon.visible = false;
        this._iconLabel.visible = true;
        this._statusItem.label.text = `${actionName}…`;
        this._startSpinner();
    }

    setDone(actionName) {
        this._stopSpinner();
        this._iconLabel.visible = false;
        this._panelIcon.icon_name = 'object-select-symbolic';
        this._panelIcon.remove_style_class_name('llm-icon-error');
        this._panelIcon.add_style_class_name('llm-icon-done');
        this._panelIcon.visible = true;
        this._statusItem.label.text = `Done — ${actionName}`;
        this._scheduleReset(2500);
    }

    setError(message) {
        this._stopSpinner();
        this._iconLabel.visible = false;
        this._panelIcon.icon_name = 'dialog-error-symbolic';
        this._panelIcon.remove_style_class_name('llm-icon-done');
        this._panelIcon.add_style_class_name('llm-icon-error');
        this._panelIcon.visible = true;
        this._statusItem.label.text = `Error: ${message.substring(0, 50)}`;
        this._scheduleReset(4000);
    }

    setIdle() {
        this._stopSpinner();
        this._iconLabel.visible = false;
        this._panelIcon.icon_name = 'document-edit-symbolic';
        this._panelIcon.remove_style_class_name('llm-icon-done');
        this._panelIcon.remove_style_class_name('llm-icon-error');
        this._panelIcon.visible = true;
        this._statusItem.label.text = 'Ready';
    }

    // ── Animation helpers ────────────────────────────────────────────────────

    _startSpinner() {
        this._stopSpinner();
        let frame = 0;
        this._animTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            if (!this._iconLabel) return GLib.SOURCE_REMOVE;
            this._iconLabel.text = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
            frame++;
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopSpinner() {
        if (this._animTimer !== null) {
            GLib.source_remove(this._animTimer);
            this._animTimer = null;
        }
    }

    _scheduleReset(ms) {
        this._cancelResetTimer();
        this._resetTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            this.setIdle();
            this._resetTimer = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _cancelResetTimer() {
        if (this._resetTimer !== null) {
            GLib.source_remove(this._resetTimer);
            this._resetTimer = null;
        }
    }

    showResult(resultText, actionName) {
        this._lastResultFull = resultText;

        const MAX_CHARS = 280;
        const preview = (resultText || '')
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        this._resultActionLabel.text = actionName;
        this._resultTextLabel.text = preview.length > MAX_CHARS
            ? preview.substring(0, MAX_CHARS - 1) + '…'
            : preview;
        this._resultPreviewItem.visible = true;
    }

    // ── Cleanup ──────────────────────────────────────────────────────────────

    destroy() {
        this._stopSpinner();
        this._cancelResetTimer();
        if (this._quotaTimer !== null) {
            GLib.source_remove(this._quotaTimer);
            this._quotaTimer = null;
        }
        super.destroy();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Extension
// ─────────────────────────────────────────────────────────────────────────────

export default class LLMTextProExtension extends Extension {

    constructor(metadata) {
        super(metadata);
        this._indicator          = null;
        this._settings           = null;
        this._httpSession        = null;
        this._accelMap           = new Map();
        this._displaySignalId    = null;
        this._settingsSignalId   = null;
        this._history            = [];
        this._usage              = null;
        this._isProcessing       = false;
        this._currentActionName  = null;
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    _historyFilePath() {
        return GLib.build_filenamev([
            GLib.get_user_data_dir(),
            'gnome-shell', 'extensions', 'llm-text-pro@sokolowski.at', 'history.json',
        ]);
    }

    _loadHistory() {
        try {
            const [ok, bytes] = GLib.file_get_contents(this._historyFilePath());
            if (!ok) return [];
            return JSON.parse(new TextDecoder().decode(bytes));
        } catch (_) {
            return [];
        }
    }

    _saveHistory() {
        try {
            const path = this._historyFilePath();
            GLib.mkdir_with_parents(GLib.path_get_dirname(path), 0o755);
            GLib.file_set_contents(path, JSON.stringify(this._history));
        } catch (e) {
            console.warn('[LLM Text Pro] Could not save history:', e.message);
        }
    }

    // ── Usage tracking ───────────────────────────────────────────────────────

    _usageFilePath() {
        return GLib.build_filenamev([
            GLib.get_user_data_dir(),
            'gnome-shell', 'extensions', 'llm-text-pro@sokolowski.at', 'usage.json',
        ]);
    }

    _emptyUsage() {
        return {
            date:    new Date().toISOString().slice(0, 10),
            claude:  { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0, cacheTokens: 0 },
            copilot: { calls: 0, premiumRequests: 0 },
            gemini:  { calls: 0, totalTokens: 0, inputTokens: 0 },
        };
    }

    _loadUsage() {
        try {
            const [ok, bytes] = GLib.file_get_contents(this._usageFilePath());
            if (!ok) return this._emptyUsage();
            const data  = JSON.parse(new TextDecoder().decode(bytes));
            const today = new Date().toISOString().slice(0, 10);
            // Reset if stored data is from a previous day
            return data.date === today ? data : this._emptyUsage();
        } catch (_) {
            return this._emptyUsage();
        }
    }

    _saveUsage(usage) {
        try {
            const path = this._usageFilePath();
            GLib.mkdir_with_parents(GLib.path_get_dirname(path), 0o755);
            GLib.file_set_contents(path, JSON.stringify(usage));
        } catch (e) {
            console.warn('[LLM Text Pro] Could not save usage:', e.message);
        }
    }

    _accumulateUsage(backend, result) {
        if (!result || !result.usage) return;

        const today = new Date().toISOString().slice(0, 10);
        if (this._usage.date !== today) this._usage = this._emptyUsage();

        if (backend === 'claude-cli') {
            const u = this._usage.claude;
            u.calls++;
            u.costUsd      += result.usage.costUsd      || 0;
            u.inputTokens  += result.usage.inputTokens  || 0;
            u.outputTokens += result.usage.outputTokens || 0;
            u.cacheTokens  += result.usage.cacheTokens  || 0;
        } else if (backend === 'copilot-cli') {
            const u = this._usage.copilot;
            u.calls++;
            u.premiumRequests += result.usage.premiumRequests || 0;
        } else if (backend === 'gemini-cli') {
            const u = this._usage.gemini;
            u.calls++;
            u.totalTokens += result.usage.totalTokens || 0;
            u.inputTokens += result.usage.inputTokens || 0;
        }

        this._saveUsage(this._usage);
    }

    enable() {
        this._settings    = this.getSettings();
        this._httpSession = new Soup.Session();
        this._history     = this._loadHistory();
        this._usage       = this._loadUsage();

        this._indicator = new TextProIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        this._displaySignalId = global.display.connect(
            'accelerator-activated',
            (_display, accelId) => this._onAcceleratorActivated(accelId)
        );

        this._bindAllHotkeys();

        this._settingsSignalId = this._settings.connect(
            'changed::actions-json',
            () => {
                this._unbindAllHotkeys();
                this._bindAllHotkeys();
            }
        );
    }

    disable() {
        if (this._settingsSignalId) {
            this._settings?.disconnect(this._settingsSignalId);
            this._settingsSignalId = null;
        }

        if (this._displaySignalId) {
            global.display.disconnect(this._displaySignalId);
            this._displaySignalId = null;
        }

        this._unbindAllHotkeys();

        this._indicator?.destroy();
        this._indicator = null;

        this._httpSession?.abort();
        this._httpSession = null;

        this._settings          = null;
        this._history           = [];
        this._usage             = null;
        this._isProcessing      = false;
        this._currentActionName = null;
    }

    // ── Actions ──────────────────────────────────────────────────────────────

    _getActions() {
        try {
            return JSON.parse(this._settings.get_string('actions-json'));
        } catch (_e) {
            return [];
        }
    }

    // ── Hotkey management ────────────────────────────────────────────────────

    _bindAllHotkeys() {
        const actions = this._getActions();
        actions.forEach(action => {
            if (action.enabled && action.hotkey && action.hotkey.trim() !== '') {
                this._bindHotkey(action);
            }
        });
    }

    _bindHotkey(action) {
        try {
            const accelId = global.display.grab_accelerator(
                action.hotkey,
                Meta.KeyBindingFlags.NONE
            );
            if (accelId === Meta.KeyBindingAction.NONE) {
                console.warn(`[LLM Text Pro] Could not grab accelerator for ${action.hotkey}`);
                return;
            }
            const bindingName = Meta.external_binding_name_for_action(accelId);
            Main.wm.allowKeybinding(bindingName, Shell.ActionMode.ALL);
            this._accelMap.set(accelId, action.id);
        } catch (e) {
            console.warn(`[LLM Text Pro] Hotkey binding error for ${action.hotkey}: ${e.message}`);
        }
    }

    _unbindAllHotkeys() {
        this._accelMap.forEach((actionId, accelId) => {
            try {
                const bindingName = Meta.external_binding_name_for_action(accelId);
                Main.wm.removeKeybinding(bindingName);
                global.display.ungrab_accelerator(accelId);
            } catch (_e) {}
        });
        this._accelMap.clear();
    }

    _onAcceleratorActivated(accelId) {
        const actionId = this._accelMap.get(accelId);
        if (!actionId) return;

        const action = this._getActions().find(a => a.id === actionId);
        if (action && action.enabled) {
            this._processClipboard(action);
        }
    }

    // ── Clipboard processing ─────────────────────────────────────────────────

    async _processClipboard(action) {
        if (this._isProcessing) {
            Main.notify('LLM Text Pro', `Still running "${this._currentActionName || 'an action'}" — please wait…`);
            return;
        }
        this._isProcessing      = true;
        this._currentActionName = action.name;
        this._indicator?.setProcessing(action.name);

        const showNotif = this._settings.get_boolean('show-notifications');

        // Resolve backend early so we can include it in the start notification
        const globalBackend = this._settings.get_string('backend');
        const backend       = (action.backend && action.backend !== 'default')
            ? action.backend
            : globalBackend;
        const backendName   = backend.replace('-cli', '');

        try {
            const clipboard = St.Clipboard.get_default();
            const inputText = await new Promise((resolve, reject) => {
                clipboard.get_text(St.ClipboardType.CLIPBOARD, (_clip, text) => {
                    if (text && text.trim().length > 0) {
                        resolve(text);
                    } else {
                        reject(new Error('Clipboard is empty or contains no text.'));
                    }
                });
            });

            const inputWords = _wc(inputText);

            if (showNotif) {
                Main.notify('LLM Text Pro', `Running "${action.name}"…\n${inputWords} words · ${backendName}`);
            }

            const startTime  = Date.now();
            const result     = await this._callBackend(backend, action.prompt, inputText);
            const durationMs = Date.now() - startTime;

            const resultText = (result && typeof result === 'object') ? result.text : String(result);

            if (!resultText) throw new Error('Backend returned an empty result.');

            clipboard.set_text(St.ClipboardType.CLIPBOARD, resultText);

            if (this._settings.get_boolean('auto-paste')) {
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 80, () => {
                    this._simulatePaste();
                    return GLib.SOURCE_REMOVE;
                });
            }

            const resultWords = _wc(resultText);
            const tokMatch    = ((result && result.info) || '').match(/Tokens:\s*(\d+)/);
            const modelInfo   = (result && result.info) ? result.info : '';

            const histSize = this._settings.get_int('history-size');
            this._history.push({
                actionName:  action.name,
                actionId:    action.id,
                input:       inputText.substring(0, 500),
                result:      resultText,
                timestamp:   Date.now(),
                backend,
                modelInfo,
                inputWords,
                resultWords,
                durationMs,
            });
            while (this._history.length > histSize) this._history.shift();
            this._saveHistory();

            // Accumulate usage stats and refresh tray display
            this._accumulateUsage(backend, result);
            this._indicator?._updateQuotaDisplay();

            this._indicator?.setDone(action.name);
            this._indicator?.showResult(resultText, action.name);

            if (showNotif) {
                const secs      = (durationMs / 1000).toFixed(1);
                const metaParts = [
                    `${inputWords}→${resultWords} words`,
                    `${secs}s`,
                    tokMatch ? `${tokMatch[1]} tokens` : null,
                    backendName,
                ].filter(Boolean);
                Main.notify('LLM Text Pro', `"${action.name}" done\n${metaParts.join(' · ')}`);
            }

        } catch (e) {
            console.error('[LLM Text Pro] Error:', e);
            this._indicator?.setError(e.message);
            Main.notifyError('LLM Text Pro', _friendlyError(e.message));
        } finally {
            this._isProcessing      = false;
            this._currentActionName = null;
        }
    }

    // ── Backend dispatcher ───────────────────────────────────────────────────

    async _callBackend(backend, prompt, text) {
        switch (backend) {
            case 'gemini-cli':
                return this._callCLI('gemini', prompt, text);
            case 'claude-cli':
                return this._callCLI('claude', prompt, text);
            case 'copilot-cli':
                return this._callCLI('copilot', prompt, text);
            case 'local':
            default:
                return this._callLocalAPI(prompt, text);
        }
    }

    // ── Local OpenAI-compatible API ──────────────────────────────────────────

    async _callLocalAPI(prompt, text, isRetry = false) {
        if (!this._httpSession) throw new Error('HTTP session not initialised.');

        const endpoint = this._settings.get_string('api-endpoint');
        const model    = this._settings.get_string('local-model');
        const apiKey   = this._settings.get_string('api-key');

        const payload = JSON.stringify({
            model,
            messages: [
                { role: 'system', content: prompt },
                { role: 'user',   content: text   },
            ],
            stream: false,
        });

        const message = Soup.Message.new('POST', endpoint);
        message.request_headers.append('Authorization', `Bearer ${apiKey}`);
        message.set_request_body_from_bytes(
            'application/json',
            new TextEncoder().encode(payload)
        );

        let bytes;
        try {
            bytes = await new Promise((resolve, reject) => {
                this._httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (s, res) => {
                    try { resolve(s.send_and_read_finish(res)); }
                    catch (e) { reject(e); }
                });
            });
        } catch (e) {
            if (!isRetry && this._settings.get_boolean('auto-start-lms')) {
                return await this._autoStartLMSAndRetry(prompt, text);
            }
            throw e;
        }

        if (message.get_status() !== 200) {
            if (message.get_status() === 0 && !isRetry && this._settings.get_boolean('auto-start-lms')) {
                return await this._autoStartLMSAndRetry(prompt, text);
            }
            throw new Error(`API error ${message.get_status()}: ${message.get_reason_phrase()}`);
        }

        const json = JSON.parse(new TextDecoder().decode(bytes.get_data()));
        const content = json?.choices?.[0]?.message?.content;
        if (!content) throw new Error('Unexpected API response format.');

        let info = `Model: ${json.model || model}`;
        if (json.usage?.total_tokens) info += `\nTokens: ${json.usage.total_tokens}`;

        return { text: content.trim(), info };
    }

    async _autoStartLMSAndRetry(prompt, text) {
        this._indicator?.setProcessing('Starting LM Studio');
        Main.notify('LLM Text Pro', 'Starting LM Studio…');

        // Build the models health-check URL from the configured endpoint
        let modelsUrl = this._settings.get_string('api-endpoint');
        if (modelsUrl.endsWith('/chat/completions')) {
            modelsUrl = modelsUrl.replace('/chat/completions', '/models');
        } else if (!modelsUrl.endsWith('/models')) {
            modelsUrl = modelsUrl.replace(/\/?$/, '') + '/models';
        }

        // Step 1: launch the LM Studio GUI app.
        // lms CLI cannot start the server on its own — it needs the LM Studio daemon
        // (the app) to already be running. So we always launch the app first.
        const launched = await this._launchLMStudio();
        if (!launched) {
            throw new Error('Could not launch LM Studio — is it installed at /usr/bin/lm-studio or /opt/lm-studio/?');
        }

        // Step 2: poll the API endpoint every 2 s for up to 90 s.
        // Every 10 s we also fire 'lms server start' in case the app is up but its
        // server didn't auto-start (happens when LM Studio was previously closed with
        // the server off).
        const lmsPaths = [GLib.get_home_dir() + '/.lmstudio/bin/lms', 'lms'];
        const POLL_MS = 2000;
        const MAX_POLLS = 45;

        for (let poll = 1; poll <= MAX_POLLS; poll++) {
            await new Promise(r => {
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_MS, () => { r(); return GLib.SOURCE_REMOVE; });
            });

            // Every 5th poll (~10 s) try 'lms server start'; ignore errors if daemon not ready yet
            if (poll % 5 === 0) {
                for (const lmsPath of lmsPaths) {
                    try {
                        const proc = new Gio.Subprocess({
                            argv: [lmsPath, 'server', 'start'],
                            flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
                        });
                        proc.init(null);
                        break;
                    } catch (_e) {}
                }
            }

            // Check if API is responding
            try {
                const sess = new Soup.Session();
                sess.timeout = 2;
                const msg = Soup.Message.new('GET', modelsUrl);
                await new Promise((resolve, reject) => {
                    sess.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (s, res) => {
                        try { resolve(s.send_and_read_finish(res)); }
                        catch (e) { reject(e); }
                    });
                });
                if (msg.get_status() === 200) {
                    Main.notify('LLM Text Pro', 'LM Studio ready — processing…');
                    return this._callLocalAPI(prompt, text, true);
                }
            } catch (_e) { /* not ready yet */ }
        }

        throw new Error('LM Studio did not become ready within 90 s.');
    }

    async _launchLMStudio() {
        // Launch the LM Studio GUI app — known install locations on this system
        const appCandidates = [
            ['/usr/bin/lm-studio'],
            ['/opt/lm-studio/lm-studio.AppImage'],
            ['lm-studio'],
            ['lmstudio'],
            ['flatpak', 'run', 'ai.lmstudio.LMStudio'],
        ];
        for (const argv of appCandidates) {
            try {
                const proc = new Gio.Subprocess({ argv, flags: Gio.SubprocessFlags.NONE });
                proc.init(null);
                return true;
            } catch (_e) {}
        }
        return false;
    }

    // ── CLI backends (Gemini / Claude / Copilot) ─────────────────────────────

    async _callCLI(cliType, prompt, text) {
        let cliPath, args;
        const fullInput = `${prompt}\n\n${text}`;

        if (cliType === 'gemini') {
            cliPath = this._settings.get_string('gemini-cli-path');
            const model = this._settings.get_string('gemini-model');
            args = [cliPath, '-p', fullInput];
            if (model && model.trim() !== '' && model.toLowerCase() !== 'default (auto)') {
                args.push('--model', model);
            }
            args.push('--output-format', 'json');
        } else if (cliType === 'claude') {
            cliPath = this._settings.get_string('claude-cli-path');
            const model = this._settings.get_string('claude-model');
            args = [cliPath, '-p', fullInput];
            if (model && model.trim() !== '' && model.toLowerCase() !== 'default (auto)') {
                args.push('--model', model);
            }
            args.push('--output-format', 'json');
        } else if (cliType === 'copilot') {
            cliPath = this._settings.get_string('copilot-cli-path');
            const model = this._settings.get_string('copilot-model');
            args = [cliPath, '-p', fullInput];
            if (model && model.trim() !== '' && model.toLowerCase() !== 'default (auto)') {
                args.push('--model', model);
            }
            args.push('--output-format', 'json');
        }

        const proc = new Gio.Subprocess({
            argv: args,
            flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
        });
        proc.init(null);

        return new Promise((resolve, reject) => {
            proc.communicate_utf8_async(null, null, (p, res) => {
                try {
                    const [, stdout, stderr] = p.communicate_utf8_finish(res);
                    const exit = p.get_exit_status();

                    const out = stdout?.trim();
                    const err = stderr?.trim();

                    let parsedJson = null;
                    let isJsonl = false;

                    if (out) {
                        // Gemini may emit warning lines before the JSON object
                        let rawOut = out;
                        if (cliType === 'gemini') {
                            const jsonStart = rawOut.indexOf('{');
                            if (jsonStart > 0) rawOut = rawOut.slice(jsonStart);
                        }
                        try {
                            parsedJson = JSON.parse(rawOut);
                        } catch (e) {
                            if (out.includes('{"type":"assistant.message"') || out.includes('{"type":"result"')) {
                                isJsonl = true;
                            }
                        }
                    }

                    if (exit !== 0) {
                        let errMsg = `${cliType} CLI exited with ${exit}`;
                        if (parsedJson && parsedJson.is_error && parsedJson.result) {
                            errMsg = parsedJson.result;
                        } else if (isJsonl && out.includes('"is_error":true')) {
                            const lines = out.split('\n');
                            for (const line of lines) {
                                try {
                                    const j = JSON.parse(line);
                                    if (j.type === 'result' && j.is_error) errMsg = j.result;
                                } catch (_e) {}
                            }
                        } else if (err) {
                            errMsg = err;
                        } else if (out) {
                            errMsg = out;
                        }
                        reject(new Error(errMsg));
                    } else {
                        if (!out) {
                            reject(new Error(err
                                ? `${cliType} stderr: ${err}`
                                : `${cliType} CLI returned empty output.`));
                        } else if (cliType === 'copilot' && isJsonl) {
                            let text = '';
                            let tokens = 0;
                            let modelName = 'Copilot Default';
                            let premiumRequests = 0;
                            for (const line of out.split('\n')) {
                                try {
                                    const j = JSON.parse(line);
                                    if (j.type === 'assistant.message' && j.data?.content) {
                                        text = j.data.content;
                                        if (j.data.outputTokens) tokens = j.data.outputTokens;
                                    }
                                    if (j.type === 'session.tools_updated' && j.data?.model) {
                                        modelName = j.data.model;
                                    }
                                    if (j.type === 'result' && j.usage) {
                                        premiumRequests = j.usage.premiumRequests || 0;
                                    }
                                } catch (_e) {}
                            }
                            resolve({
                                text: text.trim(),
                                info: `Model: ${modelName}` + (tokens > 0 ? `\nTokens: ${tokens}` : ''),
                                usage: { premiumRequests },
                            });
                        } else if (parsedJson && !isJsonl) {
                            let text = '';
                            let info = '';
                            let usageData = {};
                            if (cliType === 'gemini') {
                                text = parsedJson.response || '';
                                let modelName = 'Gemini Default';
                                let totalTokens = 0;
                                let inputTokens = 0;
                                if (parsedJson.stats?.models) {
                                    const models = Object.keys(parsedJson.stats.models);
                                    if (models.length > 0) {
                                        modelName   = models[0];
                                        const mstat = parsedJson.stats.models[modelName];
                                        totalTokens = mstat.tokens?.total || 0;
                                        inputTokens = mstat.tokens?.input || 0;
                                    }
                                }
                                info = `Model: ${modelName}`;
                                if (totalTokens > 0) info += `\nTokens: ${totalTokens}`;
                                usageData = { totalTokens, inputTokens };
                            } else {
                                // Claude
                                text = parsedJson.result || '';
                                const inputTokens  = parsedJson.usage?.input_tokens || 0;
                                const outputTokens = parsedJson.usage?.output_tokens || 0;
                                const cacheTokens  = parsedJson.usage?.cache_read_input_tokens || 0;
                                const costUsd      = parsedJson.total_cost_usd || 0;
                                let modelName = 'Claude Default';
                                if (parsedJson.modelUsage) {
                                    const models = Object.keys(parsedJson.modelUsage);
                                    if (models.length > 0) modelName = models[0];
                                }
                                info = `Model: ${modelName}`;
                                const totalTokens = inputTokens + outputTokens;
                                if (totalTokens > 0) info += `\nTokens: ${totalTokens}`;
                                usageData = { costUsd, inputTokens, outputTokens, cacheTokens };
                            }
                            resolve({ text: text.trim(), info, usage: usageData });
                        } else {
                            resolve({ text: out, info: 'Model: Default (Auto)' });
                        }
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    // ── Auto-paste ───────────────────────────────────────────────────────────

    _simulatePaste() {
        try {
            const seat = Clutter.get_default_backend().get_default_seat();
            const vkbd = seat.create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
            const t    = global.get_current_time();

            vkbd.notify_keyval(t,     Clutter.KEY_Control_L, Clutter.KeyState.PRESSED);
            vkbd.notify_keyval(t,     Clutter.KEY_v,         Clutter.KeyState.PRESSED);
            vkbd.notify_keyval(t + 1, Clutter.KEY_v,         Clutter.KeyState.RELEASED);
            vkbd.notify_keyval(t + 1, Clutter.KEY_Control_L, Clutter.KeyState.RELEASED);
        } catch (e) {
            console.warn('[LLM Text Pro] Auto-paste failed:', e.message);
        }
    }
}
