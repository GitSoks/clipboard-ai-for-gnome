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
// Animated Tray Indicator
// ─────────────────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const ICON_IDLE      = '✨';
const ICON_DONE      = '✓';
const ICON_ERROR     = '✗';

const TextProIndicator = GObject.registerClass(
class TextProIndicator extends PanelMenu.Button {

    _init(extension) {
        super._init(0.0, 'LLM Text Pro');
        this._ext = extension;

        const box = new St.BoxLayout({ vertical: false, style_class: 'panel-status-indicators-box' });
        
        this._mainIcon = new St.Icon({
            icon_name: 'preferences-system-search-symbolic',
            style_class: 'system-status-icon',
        });
        box.add_child(this._mainIcon);

        // Panel label (shows animated icon + optional short status text)
        this._iconLabel = new St.Label({
            text: ICON_IDLE,
            style_class: 'llm-text-pro-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        box.add_child(this._iconLabel);

        this._topLabel = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'llm-top-label',
        });
        box.add_child(this._topLabel);
        
        this.add_child(box);

        this._animTimer = null;
        this._resetTimer = null;
        this._quotaTimer = null;

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
        
        const enabled = this._ext._settings.get_boolean('auto-check-quota');
        if (enabled) {
            // Auto-check quota every 5 minutes (300,000 ms)
            this._quotaTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300000, () => {
                this._checkQuota(true);
                return GLib.SOURCE_CONTINUE;
            });
            // Fire initial quota check
            this._checkQuota(true);
        }
    }

    // ── Menu construction ────────────────────────────────────────────────────

    _buildMenu() {
        // Top status row (non-interactive)
        this._statusItem = new PopupMenu.PopupImageMenuItem('Ready', 'dialog-information-symbolic', { reactive: false });
        this._statusItem.label.style_class = 'llm-status-label';
        this.menu.addMenuItem(this._statusItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Custom Backend Slide Switch
        this._backendBoxItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        
        const backendContainerOuter = new St.BoxLayout({ vertical: false, x_expand: true });
        
        const backendLabel = new St.Label({
            text: 'AI Backend:',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'llm-backend-title',
            x_expand: true,
        });
        backendContainerOuter.add_child(backendLabel);

        this._backendSwitchBox = new St.BoxLayout({ 
            vertical: false, 
            style_class: 'llm-backend-switch-container' 
        });
        backendContainerOuter.add_child(this._backendSwitchBox);
        
        this._backendBoxItem.add_child(backendContainerOuter);
        this.menu.addMenuItem(this._backendBoxItem);

        // Quota Status Item
        this._quotaItem = new PopupMenu.PopupImageMenuItem('Quota: Unknown (Click to check)', 'network-server-symbolic');
        this._quotaItem.connect('activate', () => {
            this._checkQuota(false);
        });
        this.menu.addMenuItem(this._quotaItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Placeholder for dynamic action items — rebuilt when menu opens
        this._actionsSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._actionsSection);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // History sub-menu
        this._historyMenu = new PopupMenu.PopupSubMenuMenuItem('Transformation History');
        this._historyMenu.icon.icon_name = 'document-open-recent-symbolic';
        this.menu.addMenuItem(this._historyMenu);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Settings item
        const settingsItem = new PopupMenu.PopupImageMenuItem('Extension Settings', 'preferences-system-symbolic');
        settingsItem.connect('activate', () => this._ext.openPreferences());
        this.menu.addMenuItem(settingsItem);

        // Rebuild actions whenever the menu opens (picks up settings changes)
        this.menu.connect('open-state-changed', (menu, open) => {
            if (open) {
                this._rebuildBackendMenu();
                this._rebuildActionItems();
                this._rebuildHistory();
                this._updateStatusInfo();
            }
        });
        
        // Initial setup
        this._updateStatusInfo();
        this._rebuildBackendMenu();
    }
    
    _updateStatusInfo() {
        const backend = this._ext._settings.get_string('backend');
        let info = 'Ready';
        if (backend === 'local') {
            const model = this._ext._settings.get_string('local-model');
            info = `Status: Local (${model})`;
        } else if (backend === 'gemini-cli') {
            const model = this._ext._settings.get_string('gemini-model');
            info = `Status: Gemini (${model})`;
        } else if (backend === 'claude-cli') {
            const model = this._ext._settings.get_string('claude-model');
            info = `Status: Claude (${model})`;
        }
        
        if (this._iconLabel.text === ICON_IDLE) {
            this._statusItem.label.text = info;
        }
    }

    _rebuildBackendMenu() {
        this._backendSwitchBox.destroy_all_children();
        const current = this._ext._settings.get_string('backend');
        
        const backends = [
            { id: 'local', name: 'Local' },
            { id: 'gemini-cli', name: 'Gemini' },
            { id: 'claude-cli', name: 'Claude' }
        ];
        
        backends.forEach(b => {
            const btn = new St.Button({
                label: b.name,
                style_class: b.id === current ? 'llm-backend-btn llm-backend-btn-active' : 'llm-backend-btn',
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
        if (!silent) this.setProcessing('Checking API...');
        
        const backend = this._ext._settings.get_string('backend');
        if (backend === 'local') {
            this._quotaItem.label.text = 'Local AI: Checking status...';
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

                if (msg.get_status() !== 200) {
                    throw new Error(`HTTP ${msg.get_status()}`);
                }

                const json = JSON.parse(new TextDecoder().decode(bytes.get_data()));
                const models = (json.data || []);
                
                if (models.length === 0) {
                    this._quotaItem.label.text = 'Local AI: Online (No model loaded)';
                    this._topLabel.text = ' (Idle)';
                } else {
                    const activeModel = models[0].id.split('/').pop();
                    let infoStr = `Local AI: Online (${activeModel})`;
                    
                    // Display size if LM studio provides it
                    if (models[0].size) {
                        const sizeGB = (models[0].size / 1e9).toFixed(1);
                        infoStr += ` - ${sizeGB}GB`;
                    }
                    
                    this._quotaItem.label.text = infoStr;
                    this._topLabel.text = `  [${activeModel}]`;
                    
                    if (this._iconLabel.text === ICON_IDLE) {
                        this._statusItem.label.text = `Status: Local (${activeModel})`;
                    }
                }
                if (!silent) this.setDone('Local API OK');
            } catch (e) {
                this._quotaItem.label.text = 'Local AI: Offline / Unreachable';
                this._topLabel.text = ' (Offline)';
                if (!silent) this.setError('Local API Offline');
            }
            return;
        }

        // Hide top label for cloud APIs
        this._topLabel.text = '';
        this._quotaItem.label.text = 'Quota: Checking...';
        try {
            // Send a tiny prompt to verify quota
            await this._ext._callBackend(backend, "Reply only 'OK'", "Test");
            this._quotaItem.label.text = 'Quota: 0% Used (OK)';
            if (!silent) this.setDone('Quota OK');
        } catch (e) {
            const errStr = (e.message || String(e)).toLowerCase();
            let limitFound = false;
            
            // Extract or infer percent based on known CLI messages
            if (errStr.includes('hit your limit') || errStr.includes('capacity') || errStr.includes('429')) {
                this._quotaItem.label.text = 'Quota: 100% Used (Limit Reached)';
                limitFound = true;
            } else {
                // If it fails for another reason (e.g. timeout, 404 model not found)
                this._quotaItem.label.text = 'Quota: Error (Check logs)';
            }
            
            if (!silent) {
                this.setError(limitFound ? 'API Limit Reached' : 'API Check Error');
            }
        }
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
            const item = new PopupMenu.PopupImageMenuItem(action.name, 'system-run-symbolic');
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
            const none = new PopupMenu.PopupMenuItem('No history yet', { reactive: false });
            this._historyMenu.menu.addMenuItem(none);
            return;
        }

        // Most-recent first
        [...history].reverse().forEach((entry, i) => {
            const snippet = entry.result.replace(/\n/g, ' ').substring(0, 60);
            const item = new PopupMenu.PopupImageMenuItem(`${entry.actionName}: ${snippet}…`, 'edit-copy-symbolic');
            item.connect('activate', () => {
                const clipboard = St.Clipboard.get_default();
                clipboard.set_text(St.ClipboardType.CLIPBOARD, entry.result);
                if (this._ext._settings.get_boolean('auto-paste')) {
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 80, () => {
                        this._ext._simulatePaste();
                        return GLib.SOURCE_REMOVE;
                    });
                }
                Main.notify('LLM Text Pro', 'History item copied to clipboard.');
            });
            this._historyMenu.menu.addMenuItem(item);
        });

        if (history.length > 0) {
            this._historyMenu.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            const clearItem = new PopupMenu.PopupImageMenuItem('Clear History', 'user-trash-symbolic');
            clearItem.connect('activate', () => {
                this._ext._history = [];
                this._rebuildHistory();
            });
            this._historyMenu.menu.addMenuItem(clearItem);
        }
    }

    // ── State setters ────────────────────────────────────────────────────────

    setProcessing(actionName) {
        this._cancelResetTimer();
        this._iconLabel.remove_style_class_name('llm-done');
        this._iconLabel.remove_style_class_name('llm-error');
        this._iconLabel.add_style_class_name('llm-processing');
        this._statusItem.label.text = `${actionName}…`;
        this._startSpinner();
    }

    setDone(actionName) {
        this._stopSpinner();
        this._iconLabel.remove_style_class_name('llm-processing');
        this._iconLabel.remove_style_class_name('llm-error');
        this._iconLabel.add_style_class_name('llm-done');
        this._iconLabel.text = ICON_DONE;
        this._statusItem.label.text = `Done — ${actionName}`;
        this._scheduleReset(2500);
    }

    setError(message) {
        this._stopSpinner();
        this._iconLabel.remove_style_class_name('llm-processing');
        this._iconLabel.remove_style_class_name('llm-done');
        this._iconLabel.add_style_class_name('llm-error');
        this._iconLabel.text = ICON_ERROR;
        this._statusItem.label.text = `Error: ${message.substring(0, 50)}`;
        this._scheduleReset(4000);
    }

    setIdle() {
        this._stopSpinner();
        this._iconLabel.remove_style_class_name('llm-processing');
        this._iconLabel.remove_style_class_name('llm-done');
        this._iconLabel.remove_style_class_name('llm-error');
        this._iconLabel.text = ICON_IDLE;
        this._statusItem.label.text = 'Ready';
    }

    // ── Animation helpers ────────────────────────────────────────────────────

    _startSpinner() {
        this._stopSpinner();
        let frame = 0;
        this._animTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 120, () => {
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
        this._indicator      = null;
        this._settings       = null;
        this._httpSession     = null;
        this._accelMap        = new Map();   // accelId → action.id
        this._displaySignalId = null;
        this._settingsSignalId = null;
        this._history         = [];
        this._isProcessing    = false;
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    enable() {
        this._settings   = this.getSettings();
        this._httpSession = new Soup.Session();
        this._history    = [];

        this._indicator = new TextProIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        // Connect accelerator-activated ONCE on the display
        this._displaySignalId = global.display.connect(
            'accelerator-activated',
            (_display, accelId) => this._onAcceleratorActivated(accelId)
        );

        this._bindAllHotkeys();

        // Re-bind when actions JSON changes in settings
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

        this._settings   = null;
        this._history    = [];
        this._isProcessing = false;
    }

    // ── Actions ──────────────────────────────────────────────────────────────

    _getActions() {
        try {
            return JSON.parse(this._settings.get_string('actions-json'));
        } catch (_e) {
            return [];
        }
    }

    // ── Hotkey management (via grab_accelerator) ──────────────────────────────

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
            } catch (_e) {
                // Ignore errors on disable
            }
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
            Main.notify('LLM Text Pro', 'Already processing, please wait…');
            return;
        }
        this._isProcessing = true;
        this._indicator?.setProcessing(action.name);

        const showNotif = this._settings.get_boolean('show-notifications');

        try {
            // Read clipboard
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

            if (showNotif) {
                Main.notify('LLM Text Pro', `Running "${action.name}"…`);
            }

            // Determine effective backend
            const globalBackend = this._settings.get_string('backend');
            const backend = (action.backend && action.backend !== 'default')
                ? action.backend
                : globalBackend;

            // Call backend
            const resultText = await this._callBackend(backend, action.prompt, inputText);

            // Write result to clipboard
            clipboard.set_text(St.ClipboardType.CLIPBOARD, resultText);

            // Auto-paste
            if (this._settings.get_boolean('auto-paste')) {
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 80, () => {
                    this._simulatePaste();
                    return GLib.SOURCE_REMOVE;
                });
            }

            // Record history
            const histSize = this._settings.get_int('history-size');
            this._history.push({
                actionName: action.name,
                input: inputText.substring(0, 200),
                result: resultText,
                timestamp: Date.now(),
            });
            while (this._history.length > histSize) {
                this._history.shift();
            }

            this._indicator?.setDone(action.name);

            if (showNotif) {
                Main.notify('LLM Text Pro', `✓ "${action.name}" complete!`);
            }

        } catch (e) {
            console.error(`[LLM Text Pro] Error:`, e);
            this._indicator?.setError(e.message);
            Main.notifyError('LLM Text Pro', e.message);
        } finally {
            this._isProcessing = false;
        }
    }

    // ── Backend dispatcher ───────────────────────────────────────────────────

    async _callBackend(backend, prompt, text) {
        switch (backend) {
            case 'gemini-cli':
                return this._callCLI('gemini', prompt, text);
            case 'claude-cli':
                return this._callCLI('claude', prompt, text);
            case 'local':
            default:
                return this._callLocalAPI(prompt, text);
        }
    }

    // ── Local OpenAI-compatible API ───────────────────────────────────────────

    async _callLocalAPI(prompt, text) {
        if (!this._httpSession) throw new Error('HTTP session not initialised.');

        const endpoint  = this._settings.get_string('api-endpoint');
        const model     = this._settings.get_string('local-model');
        const apiKey    = this._settings.get_string('api-key');

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

        const bytes = await this._httpSession.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null
        );

        if (message.get_status() !== 200) {
            throw new Error(
                `API error ${message.get_status()}: ${message.get_reason_phrase()}`
            );
        }

        const json = JSON.parse(new TextDecoder().decode(bytes.get_data()));
        const content = json?.choices?.[0]?.message?.content;
        if (!content) throw new Error('Unexpected API response format.');
        
        let info = `Model: ${json.model || model}`;
        if (json.usage && json.usage.total_tokens) {
            info += `\nTokens: ${json.usage.total_tokens}`;
        }
        
        return { text: content.trim(), info };
    }

    // ── CLI backends (Gemini / Claude) ───────────────────────────────────────

    async _callCLI(cliType, prompt, text) {
        let cliPath, args;
        const fullInput = `${prompt}\n\n${text}`;

        if (cliType === 'gemini') {
            cliPath = this._settings.get_string('gemini-cli-path');
            const model = this._settings.get_string('gemini-model');
            // Use -p for non-interactive (headless) mode in Gemini CLI
            args = [cliPath, '-p', fullInput];
            if (model && model.trim() !== '' && model.toLowerCase() !== 'default (auto)') {
                args.push('--model', model);
            }
            args.push('--output-format', 'json');
        } else {
            // Claude Code CLI: claude -p "prompt" [--model model]
            cliPath = this._settings.get_string('claude-cli-path');
            const model = this._settings.get_string('claude-model');
            args = [cliPath, '-p', fullInput];
            if (model && model.trim() !== '' && model.toLowerCase() !== 'default (auto)') {
                args.push('--model', model);
            }
            args.push('--output-format', 'json');
        }

        const proc = new Gio.Subprocess({
            argv: args,
            flags: Gio.SubprocessFlags.STDOUT_PIPE
                 | Gio.SubprocessFlags.STDERR_PIPE,
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
                    if (out && out.startsWith('{')) {
                        try {
                            parsedJson = JSON.parse(out);
                        } catch (e) {}
                    }
                    
                    if (exit !== 0) {
                        let errMsg = `${cliType} CLI exited with ${exit}`;
                        if (parsedJson && parsedJson.is_error && parsedJson.result) {
                            errMsg = parsedJson.result;
                        } else if (err) {
                            errMsg = err;
                        } else if (out) {
                            errMsg = out;
                        }
                        reject(new Error(errMsg));
                    } else {
                        if (!out) {
                            if (err) {
                                reject(new Error(`${cliType} stderr info: ${err}`));
                            } else {
                                reject(new Error(`${cliType} CLI returned empty output.`));
                            }
                        } else {
                            if (parsedJson) {
                                let text = '';
                                let info = '';
                                if (cliType === 'gemini') {
                                    text = parsedJson.response || '';
                                    let modelName = 'Gemini Default';
                                    let tokens = 0;
                                    if (parsedJson.stats && parsedJson.stats.models) {
                                        const models = Object.keys(parsedJson.stats.models);
                                        if (models.length > 0) {
                                            modelName = models[0];
                                            tokens = parsedJson.stats.models[modelName].tokens?.total || 0;
                                        }
                                    }
                                    info = `Model: ${modelName}`;
                                    if (tokens > 0) info += `\nTokens: ${tokens}`;
                                } else {
                                    text = parsedJson.result || '';
                                    let tokens = (parsedJson.usage?.input_tokens || 0) + (parsedJson.usage?.output_tokens || 0);
                                    let modelName = 'Claude Default';
                                    if (parsedJson.modelUsage) {
                                        const models = Object.keys(parsedJson.modelUsage);
                                        if (models.length > 0) modelName = models[0];
                                    }
                                    info = `Model: ${modelName}`;
                                    if (tokens > 0) info += `\nTokens: ${tokens}`;
                                }
                                resolve({ text: text.trim(), info });
                            } else {
                                resolve({ text: out, info: 'Model: Default (Auto)' });
                            }
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
ext Pro] Auto-paste failed:', e.message);
        }
    }
}
