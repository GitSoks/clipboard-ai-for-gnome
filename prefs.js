/**
 * LLM Text Pro — prefs.js
 * Multi-page preferences: Backend selection, CLI / API config,
 * dynamic Actions editor, and General settings.
 */

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
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
        window.set_default_size(760, 700);
        const settings = this.getSettings();

        window.add(this._buildBackendPage(settings));
        window.add(this._buildActionsPage(settings, window));
        window.add(this._buildGeneralPage(settings));
        window.add(this._buildHistoryPage(window));
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
            description: 'The global default for all actions. Each individual action can override this in the Actions editor.',
        });
        page.add(backendGroup);

        const backendRow = new Adw.ComboRow({
            title: 'Default Backend',
            subtitle: 'Used for any action whose backend is set to "Default"',
            model: new Gtk.StringList({ strings: ['Local API (Ollama / LM Studio)', 'Gemini CLI', 'Claude CLI', 'Copilot CLI'] }),
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
            description: 'Connect to Ollama, LM Studio, or any OpenAI-compatible endpoint running on your machine.',
        });
        page.add(localGroup);
        localGroup.add(makeEntry('API Endpoint', settings, 'api-endpoint'));
        localGroup.add(this._makeLocalModelEntry(settings));
        localGroup.add(makePasswordEntry('API Key', settings, 'api-key'));

        // ── Connection test row ──
        const connRow = new Adw.ActionRow({
            title: 'Connection Status',
            subtitle: 'Not tested — click Test to check the endpoint',
            activatable: false,
        });
        const connIcon = new Gtk.Image({
            icon_name: 'network-wired-symbolic',
            pixel_size: 16,
            valign: Gtk.Align.CENTER,
            css_classes: ['dim-label'],
        });
        connRow.add_prefix(connIcon);
        const testBtn = new Gtk.Button({
            label: 'Test Connection',
            valign: Gtk.Align.CENTER,
            css_classes: ['pill'],
            tooltip_text: 'Ping the API endpoint and show which model is loaded',
        });
        connRow.add_suffix(testBtn);
        localGroup.add(connRow);

        testBtn.connect('clicked', async () => {
            testBtn.set_sensitive(false);
            testBtn.set_label('Testing…');
            connRow.set_subtitle('Connecting…');
            connIcon.set_from_icon_name('network-wired-symbolic');
            connIcon.remove_css_class('success');
            connIcon.remove_css_class('error');

            try {
                let url = settings.get_string('api-endpoint');
                if (url.endsWith('/chat/completions'))
                    url = url.replace('/chat/completions', '/models');
                else if (!url.endsWith('/models'))
                    url = url.replace(/\/?$/, '') + '/models';

                const sess = new Soup.Session();
                sess.timeout = 6;
                const msg = Soup.Message.new('GET', url);
                const apiKey = settings.get_string('api-key');
                if (apiKey && apiKey !== 'random' && apiKey.trim() !== '')
                    msg.request_headers.append('Authorization', `Bearer ${apiKey}`);

                const bytes = await new Promise((res, rej) => {
                    sess.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (s, r) => {
                        try { res(s.send_and_read_finish(r)); } catch (e) { rej(e); }
                    });
                });

                if (msg.get_status() !== 200)
                    throw new Error(`HTTP ${msg.get_status()} ${msg.get_reason_phrase()}`);

                const json    = JSON.parse(new TextDecoder().decode(bytes.get_data()));
                const models  = (json.data || []);
                const primary = models[0];
                let detail;
                if (models.length === 0) {
                    detail = 'Online — no model loaded';
                } else {
                    const name = primary.id.split('/').pop();
                    const size = primary.size ? ` · ${(primary.size / 1e9).toFixed(1)} GB` : '';
                    detail = `Online — ${name}${size}` +
                        (models.length > 1 ? ` (+${models.length - 1} more)` : '');
                }
                connRow.set_subtitle(detail);
                connIcon.set_from_icon_name('emblem-ok-symbolic');
                connIcon.add_css_class('success');
                testBtn.set_label('Connected ✓');
                testBtn.add_css_class('success');
            } catch (e) {
                connRow.set_subtitle(`Offline — ${e.message.substring(0, 90)}`);
                connIcon.set_from_icon_name('network-error-symbolic');
                connIcon.add_css_class('error');
                testBtn.set_label('Failed');
                testBtn.add_css_class('destructive-action');
            } finally {
                testBtn.set_sensitive(true);
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
                    testBtn.set_label('Test Connection');
                    testBtn.remove_css_class('success');
                    testBtn.remove_css_class('destructive-action');
                    return GLib.SOURCE_REMOVE;
                });
            }
        });

        localGroup.add(makeSwitchRow(
            'Auto-Start LM Studio',
            'If the Local API is unreachable, automatically launch the LM Studio app in the background.',
            settings,
            'auto-start-lms'
        ));

        // ── Gemini CLI ──
        this._makeCliGroup(page, settings, {
            title: 'Gemini CLI',
            description: 'Requires the Google Gemini CLI installed and authenticated.',
            pathKey: 'gemini-cli-path',
            modelTitle: 'Gemini Model',
            modelKey: 'gemini-model',
            presets: [
                'Default (Auto)',
                // Shorthand aliases — resolved by the CLI at runtime (work in headless -p mode)
                'auto',       // → gemini-3-pro-preview (or gemini-2.5-pro without preview access)
                'pro',        // → same as auto
                'flash',      // → gemini-3-flash-preview
                'flash-lite', // → gemini-2.5-flash-lite
                // Gemini 3 series (current production models)
                'gemini-3-pro-preview',
                'gemini-3-flash-preview',
                'gemini-3.1-pro-preview',       // requires experimental.useGemini3_1 setting
                'gemini-3.1-flash-lite-preview',
                // Gemini 2.5 series (stable GA)
                'gemini-2.5-pro',
                'gemini-2.5-flash',
                'gemini-2.5-flash-lite',
                // Legacy (still accepted as open strings)
                'gemini-2.0-flash',
                'gemini-1.5-pro',
                'gemini-1.5-flash',
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
                // Shorthand aliases — resolved by Claude Code CLI's parseUserSpecifiedModel()
                'opus',   // → claude-opus-4-7 (current flagship)
                'sonnet', // → claude-sonnet-4-6
                'haiku',  // → claude-haiku-4-5
                'best',   // → claude-opus-4-7
                // Full Claude 4.x IDs (current)
                'claude-opus-4-7',
                'claude-sonnet-4-6',
                'claude-haiku-4-5',
                // Full Claude 4.x IDs (previous)
                'claude-opus-4-6',
                'claude-opus-4-5',
                'claude-sonnet-4-5',
                // Legacy Claude 3.x
                'claude-3-7-sonnet-20250219',
                'claude-3-5-sonnet-20241022',
                'claude-3-5-haiku-20241022',
                'claude-3-opus-20240229',
            ],
            downloadUrl: 'https://claude.ai/code',
        });

        // ── Copilot CLI ──
        // IMPORTANT: Copilot CLI uses dot notation for version numbers (claude-sonnet-4.6)
        // which differs from the Anthropic API format (claude-sonnet-4-6 with dashes).
        // Only 'auto' is a special alias; no tier shortcuts like 'sonnet'/'opus' exist here.
        this._makeCliGroup(page, settings, {
            title: 'Copilot CLI',
            description: 'Requires GitHub Copilot CLI ("copilot") installed and authenticated.',
            pathKey: 'copilot-cli-path',
            modelTitle: 'Copilot Model',
            modelKey: 'copilot-model',
            presets: [
                'Default (Auto)',
                'auto',              // let Copilot pick best available model automatically
                // Claude via Copilot — dot notation (verified from copilot help config)
                'claude-sonnet-4.6', // current default
                'claude-sonnet-4.5',
                'claude-haiku-4.5',
                'claude-opus-4.7',
                'claude-opus-4.6',
                'claude-opus-4.6-fast',
                'claude-opus-4.5',
                // OpenAI via Copilot
                'gpt-5.4',
                'gpt-5.4-mini',
                'gpt-5-mini',
                'gpt-4.1',
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

        // Today's usage stats row
        const cliType   = pathKey.replace('-cli-path', ''); // 'gemini', 'claude', 'copilot'
        const usageRow  = new Adw.ActionRow({ title: "Today's Usage", activatable: false });
        usageRow.add_prefix(new Gtk.Image({
            icon_name: 'utilities-system-monitor-symbolic',
            pixel_size: 16,
            valign: Gtk.Align.CENTER,
            css_classes: ['dim-label'],
        }));
        const refreshUsageBtn = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
            tooltip_text: 'Refresh usage stats',
        });
        usageRow.add_suffix(refreshUsageBtn);
        group.add(usageRow);

        const updateUsageRow = () => {
            try {
                const usagePath = GLib.build_filenamev([
                    GLib.get_user_data_dir(),
                    'llm-text-pro@sokolowski.at', 'usage.json',
                ]);
                const [ok, bytes] = GLib.file_get_contents(usagePath);
                if (!ok) { usageRow.set_subtitle('No usage data yet'); return; }
                const data  = JSON.parse(new TextDecoder().decode(bytes));
                const today = new Date().toISOString().slice(0, 10);
                if (data.date !== today) { usageRow.set_subtitle('No usage today'); return; }

                if (cliType === 'claude') {
                    const u = data.claude;
                    if (u.calls === 0) {
                        usageRow.set_subtitle('No calls yet today');
                    } else {
                        const cost   = u.costUsd >= 0.0001 ? `$${u.costUsd.toFixed(4)}` : '<$0.001';
                        const tokens = u.inputTokens + u.outputTokens;
                        const tokStr = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K tokens` : `${tokens} tokens`;
                        const cache  = u.cacheTokens > 0 ? ` · ${u.cacheTokens} cached` : '';
                        usageRow.set_subtitle(`${cost} · ${tokStr}${cache} · ${u.calls} call${u.calls !== 1 ? 's' : ''}`);
                    }
                } else if (cliType === 'copilot') {
                    const u = data.copilot;
                    if (u.calls === 0) {
                        usageRow.set_subtitle('No calls yet today');
                    } else {
                        usageRow.set_subtitle(`${u.premiumRequests} premium req · ${u.calls} call${u.calls !== 1 ? 's' : ''}`);
                    }
                } else if (cliType === 'gemini') {
                    const u = data.gemini;
                    if (u.calls === 0) {
                        usageRow.set_subtitle('No calls yet today');
                    } else {
                        const tokStr = u.totalTokens >= 1000
                            ? `${(u.totalTokens / 1000).toFixed(1)}K tokens`
                            : `${u.totalTokens} tokens`;
                        usageRow.set_subtitle(`${tokStr} · ${u.calls} call${u.calls !== 1 ? 's' : ''}`);
                    }
                }
            } catch (_) {
                usageRow.set_subtitle('No usage data');
            }
        };

        refreshUsageBtn.connect('clicked', updateUsageRow);
        updateUsageRow();

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
            usageRow.set_sensitive(found);
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

        // ── Behaviour ──
        const behavGroup = new Adw.PreferencesGroup({
            title: 'Behaviour',
            description: 'Control how the extension interacts with your desktop after a transformation.',
        });
        page.add(behavGroup);

        behavGroup.add(makeSwitchRow(
            'Auto-paste Result',
            'Immediately simulate Ctrl+V after processing, pasting the result into whatever window was active.',
            settings,
            'auto-paste'
        ));

        // ── Notifications ──
        const notifGroup = new Adw.PreferencesGroup({
            title: 'Notifications',
            description: 'GNOME desktop notifications shown during and after transformations.',
        });
        page.add(notifGroup);

        notifGroup.add(makeSwitchRow(
            'Show Desktop Notifications',
            'Display a notification when processing starts (with word count & backend) and when it completes (with timing and token usage).',
            settings,
            'show-notifications'
        ));

        // ── API Monitoring ──
        const apiGroup = new Adw.PreferencesGroup({
            title: 'API Health Monitoring',
            description: 'Background checks to keep the tray connection status up to date.',
        });
        page.add(apiGroup);

        apiGroup.add(makeSwitchRow(
            'Periodic Connection Check',
            'Silently ping the active backend every 5 minutes to refresh the connection status shown in the tray menu.',
            settings,
            'auto-check-quota'
        ));

        // ── History ──
        const histGroup = new Adw.PreferencesGroup({
            title: 'Transformation History',
            description: 'The full history is viewable in the History tab. The tray menu shows the most recent entries.',
        });
        page.add(histGroup);

        histGroup.add(makeSpinRow(
            'Maximum History Size',
            'Number of past transformations to retain. Oldest entries are dropped when the limit is reached. Set to 0 to disable history.',
            settings,
            'history-size',
            0,
            100
        ));

        return page;
    }

    // ── History helpers ───────────────────────────────────────────────────────

    _historyFilePath() {
        return GLib.build_filenamev([
            GLib.get_user_data_dir(),
            'llm-text-pro@sokolowski.at', 'history.json',
        ]);
    }

    _loadHistoryFile() {
        try {
            const [ok, bytes] = GLib.file_get_contents(this._historyFilePath());
            if (!ok) return [];
            return JSON.parse(new TextDecoder().decode(bytes));
        } catch (_) {
            return [];
        }
    }

    _saveHistoryFile(history) {
        try {
            const path = this._historyFilePath();
            GLib.mkdir_with_parents(GLib.path_get_dirname(path), 0o755);
            GLib.file_set_contents(path, new TextEncoder().encode(JSON.stringify(history)));
        } catch (e) {
            console.warn('[LLM Text Pro] prefs: could not save history:', e.message);
        }
    }

    // ── Page: History ─────────────────────────────────────────────────────────

    _buildHistoryPage(window) {
        const page = new Adw.PreferencesPage({
            title: 'History',
            icon_name: 'document-open-recent-symbolic',
        });

        const history = this._loadHistoryFile();

        // ── Stats ─────────────────────────────────────────────────────────────
        if (history.length > 0) {
            const actionCounts  = {};
            const backendCounts = {};
            let totalDurationMs = 0, durationCount = 0;
            let totalTokens = 0;
            let totalResultWords = 0;

            history.forEach(e => {
                actionCounts[e.actionName]  = (actionCounts[e.actionName]  || 0) + 1;
                const bk = (e.backend || 'local').replace('-cli', '');
                backendCounts[bk] = (backendCounts[bk] || 0) + 1;
                if (e.durationMs) { totalDurationMs += e.durationMs; durationCount++; }
                const m = (e.modelInfo || '').match(/Tokens:\s*(\d+)/);
                if (m) totalTokens += parseInt(m[1], 10);
                totalResultWords += (e.resultWords || 0);
            });

            const mostUsed = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];
            const bkList   = Object.entries(backendCounts).sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${k} (${v})`).join(', ');
            const avgDur   = durationCount > 0
                ? `${(totalDurationMs / durationCount / 1000).toFixed(1)}s avg`
                : null;

            const statsGroup = new Adw.PreferencesGroup({ title: 'Statistics' });
            page.add(statsGroup);

            const stats = [
                ['document-open-recent-symbolic', 'Total Transformations',
                    `${history.length} entr${history.length === 1 ? 'y' : 'ies'}`],
                ['starred-symbolic', 'Most Used Action',
                    `${mostUsed[0]} — used ${mostUsed[1]}×`],
                ['applications-science-symbolic', 'Backends Used', bkList],
                avgDur
                    ? ['preferences-system-time-symbolic', 'Average Duration', avgDur]
                    : null,
                totalTokens > 0
                    ? ['dialog-information-symbolic', 'Total Tokens Used',
                        totalTokens.toLocaleString() + ' tokens across all sessions']
                    : null,
                totalResultWords > 0
                    ? ['document-edit-symbolic', 'Total Words Generated',
                        totalResultWords.toLocaleString() + ' words']
                    : null,
            ].filter(Boolean);

            stats.forEach(([icon, title, subtitle]) => {
                const row = new Adw.ActionRow({ title, subtitle, activatable: false });
                row.add_prefix(new Gtk.Image({
                    icon_name: icon,
                    pixel_size: 16,
                    css_classes: ['dim-label'],
                    valign: Gtk.Align.CENTER,
                }));
                statsGroup.add(row);
            });
        }

        // ── Entries ───────────────────────────────────────────────────────────
        const entriesGroup = new Adw.PreferencesGroup({
            title: history.length > 0
                ? `Entries  (${history.length})`
                : 'Entries',
            description: history.length === 0
                ? 'No transformations recorded yet. Run any action from the tray icon.'
                : 'Click an entry to expand and view the full input and generated result. ' +
                  'Reopen Settings after new transformations to see them here.',
        });
        page.add(entriesGroup);

        if (history.length === 0) {
            const emptyRow = new Adw.ActionRow({
                title: 'No history yet',
                subtitle: 'Trigger any action from the tray menu to record your first transformation.',
                activatable: false,
            });
            emptyRow.add_prefix(new Gtk.Image({
                icon_name: 'document-open-recent-symbolic',
                pixel_size: 32,
                css_classes: ['dim-label'],
                valign: Gtk.Align.CENTER,
            }));
            entriesGroup.add(emptyRow);
        }

        const entryWidgets = [];

        [...history].reverse().forEach(entry => {
            const modelRaw = (entry.modelInfo || '').split('\n')[0].replace('Model: ', '');
            const model    = (modelRaw && modelRaw !== 'Default (Auto)')
                ? modelRaw.split('/').pop() : null;
            const bk       = (entry.backend || 'local').replace('-cli', '');
            const wordInfo = (entry.inputWords != null && entry.resultWords != null)
                ? `${entry.inputWords}→${entry.resultWords} words` : null;
            const durStr   = entry.durationMs != null
                ? `${(entry.durationMs / 1000).toFixed(2)}s` : null;
            const tokMatch = (entry.modelInfo || '').match(/Tokens:\s*(\d+)/);

            const d       = new Date(entry.timestamp);
            const dateStr = d.toLocaleString([], {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });

            const subtitleParts = [dateStr, bk, model, wordInfo, durStr].filter(Boolean);

            const expander = new Adw.ExpanderRow({
                title: entry.actionName,
                subtitle: subtitleParts.join(' · '),
            });
            entryWidgets.push(expander);

            // ── Backend & Model ──
            const backendSubtitle = [
                (entry.backend || 'local').replace('-cli', ' CLI').replace('local', 'Local API'),
                model,
            ].filter(Boolean).join(' — ');

            const bkRow = new Adw.ActionRow({
                title: 'Backend & Model',
                subtitle: backendSubtitle || 'Unknown',
                activatable: false,
            });
            bkRow.add_prefix(new Gtk.Image({
                icon_name: 'applications-science-symbolic',
                pixel_size: 16, css_classes: ['dim-label'], valign: Gtk.Align.CENTER,
            }));
            expander.add_row(bkRow);

            // ── Performance ──
            const perfParts = [
                durStr       ? `${durStr} processing time`         : null,
                entry.inputWords  != null ? `${entry.inputWords} words in`  : null,
                entry.resultWords != null ? `${entry.resultWords} words out` : null,
                tokMatch          ? `${tokMatch[1]} tokens used`              : null,
            ].filter(Boolean);
            if (perfParts.length > 0) {
                const perfRow = new Adw.ActionRow({
                    title: 'Performance',
                    subtitle: perfParts.join('  ·  '),
                    activatable: false,
                });
                perfRow.add_prefix(new Gtk.Image({
                    icon_name: 'utilities-system-monitor-symbolic',
                    pixel_size: 16, css_classes: ['dim-label'], valign: Gtk.Align.CENTER,
                }));
                expander.add_row(perfRow);
            }

            // ── Timestamp ──
            const tsRow = new Adw.ActionRow({
                title: 'Date & Time',
                subtitle: new Date(entry.timestamp).toLocaleString(),
                activatable: false,
            });
            tsRow.add_prefix(new Gtk.Image({
                icon_name: 'preferences-system-time-symbolic',
                pixel_size: 16, css_classes: ['dim-label'], valign: Gtk.Align.CENTER,
            }));
            expander.add_row(tsRow);

            // ── Input text ──
            if (entry.input) {
                const inputExpander = new Adw.ExpanderRow({
                    title: 'Input Text',
                    subtitle: `${entry.inputWords ?? '?'} words  ·  click to expand`,
                });
                inputExpander.add_prefix(new Gtk.Image({
                    icon_name: 'edit-paste-symbolic',
                    pixel_size: 16, css_classes: ['dim-label'], valign: Gtk.Align.CENTER,
                }));

                const inputBuf  = new Gtk.TextBuffer();
                inputBuf.set_text(entry.input, -1);
                const inputView = new Gtk.TextView({
                    buffer: inputBuf,
                    editable: false,
                    wrap_mode: Gtk.WrapMode.WORD_CHAR,
                    cursor_visible: false,
                    top_margin: 10, bottom_margin: 10,
                    left_margin: 14, right_margin: 14,
                    css_classes: ['dim-label'],
                });
                const inputScroll = new Gtk.ScrolledWindow({
                    child: inputView,
                    hscrollbar_policy: Gtk.PolicyType.NEVER,
                    height_request: 90,
                });
                const inputFrame = new Gtk.Frame({
                    child: inputScroll,
                    css_classes: ['card'],
                    margin_start: 12, margin_end: 12,
                    margin_top: 4,   margin_bottom: 8,
                });
                const inputContentRow = new Adw.PreferencesRow({ activatable: false });
                inputContentRow.set_child(inputFrame);
                inputExpander.add_row(inputContentRow);
                expander.add_row(inputExpander);
            }

            // ── Result text ──
            if (entry.result) {
                const resExpander = new Adw.ExpanderRow({
                    title: 'Generated Result',
                    subtitle: `${entry.resultWords ?? '?'} words  ·  click to expand`,
                });
                resExpander.add_prefix(new Gtk.Image({
                    icon_name: 'object-select-symbolic',
                    pixel_size: 16, css_classes: ['accent'], valign: Gtk.Align.CENTER,
                }));

                const copyBtn = new Gtk.Button({
                    label: 'Copy',
                    valign: Gtk.Align.CENTER,
                    css_classes: ['pill', 'suggested-action'],
                    tooltip_text: 'Copy the generated result to your clipboard',
                });
                resExpander.add_suffix(copyBtn);
                copyBtn.connect('clicked', () => {
                    try {
                        Gdk.Display.get_default().get_clipboard().set_text(entry.result);
                        copyBtn.set_label('Copied!');
                    } catch (_e) {
                        copyBtn.set_label('Error');
                    }
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                        copyBtn.set_label('Copy');
                        return GLib.SOURCE_REMOVE;
                    });
                });

                const resBuf  = new Gtk.TextBuffer();
                resBuf.set_text(entry.result, -1);
                const resView = new Gtk.TextView({
                    buffer: resBuf,
                    editable: false,
                    wrap_mode: Gtk.WrapMode.WORD_CHAR,
                    cursor_visible: false,
                    top_margin: 10, bottom_margin: 10,
                    left_margin: 14, right_margin: 14,
                });
                const resScroll = new Gtk.ScrolledWindow({
                    child: resView,
                    hscrollbar_policy: Gtk.PolicyType.NEVER,
                    height_request: 140,
                });
                const resFrame = new Gtk.Frame({
                    child: resScroll,
                    css_classes: ['card'],
                    margin_start: 12, margin_end: 12,
                    margin_top: 4,   margin_bottom: 8,
                });
                const resContentRow = new Adw.PreferencesRow({ activatable: false });
                resContentRow.set_child(resFrame);
                resExpander.add_row(resContentRow);
                expander.add_row(resExpander);
            }

            // ── Delete entry ──
            const delRow = new Adw.ButtonRow({
                title: 'Delete This Entry',
                start_icon_name: 'user-trash-symbolic',
            });
            delRow.add_css_class('destructive-action');
            delRow.connect('activated', () => {
                const hist = this._loadHistoryFile();
                const i = hist.findIndex(e => e.timestamp === entry.timestamp);
                if (i >= 0) {
                    hist.splice(i, 1);
                    this._saveHistoryFile(hist);
                }
                entriesGroup.remove(expander);
                const idx = entryWidgets.indexOf(expander);
                if (idx >= 0) entryWidgets.splice(idx, 1);
                entriesGroup.set_title(
                    entryWidgets.length > 0 ? `Entries  (${entryWidgets.length})` : 'Entries'
                );
            });
            expander.add_row(delRow);

            entriesGroup.add(expander);
        });

        // ── Clear All ─────────────────────────────────────────────────────────
        if (history.length > 0) {
            const actGroup = new Adw.PreferencesGroup();
            page.add(actGroup);

            const clearRow = new Adw.ButtonRow({
                title: 'Clear All History',
                start_icon_name: 'user-trash-symbolic',
            });
            clearRow.add_css_class('destructive-action');
            clearRow.connect('activated', () => {
                const dlg = new Adw.AlertDialog({
                    heading: 'Clear All History?',
                    body: `${history.length} transformation${history.length === 1 ? '' : 's'} will be permanently deleted.`,
                });
                dlg.add_response('cancel', 'Cancel');
                dlg.add_response('clear', 'Clear All');
                dlg.set_response_appearance('clear', Adw.ResponseAppearance.DESTRUCTIVE);
                dlg.connect('response', (_d, resp) => {
                    if (resp !== 'clear') return;
                    this._saveHistoryFile([]);
                    entryWidgets.forEach(w => { try { entriesGroup.remove(w); } catch (_) {} });
                    entryWidgets.length = 0;
                    entriesGroup.set_title('Entries');
                    entriesGroup.set_description('History cleared. Reopen Settings to verify.');
                    clearRow.set_sensitive(false);
                });
                dlg.present(window);
            });
            actGroup.add(clearRow);
        }

        return page;
    }

    // ── Page: About ──────────────────────────────────────────────────────────

    _buildAboutPage() {
        const page = new Adw.PreferencesPage({
            title: 'About',
            icon_name: 'help-about-symbolic',
        });

        const version  = this.metadata?.version  ?? '?';
        const shellVer = (this.metadata?.['shell-version'] ?? []).join(', ');

        // ── App header ───────────────────────────────────────────────────────
        const headerGroup = new Adw.PreferencesGroup();
        page.add(headerGroup);

        const headerRow = new Adw.ActionRow({ activatable: false, selectable: false });
        const headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            margin_top: 20,
            margin_bottom: 20,
            halign: Gtk.Align.CENTER,
            hexpand: true,
        });
        const appIcon = new Gtk.Image({
            icon_name: 'document-edit-symbolic',
            pixel_size: 72,
            css_classes: ['accent'],
            margin_bottom: 6,
        });
        headerBox.append(appIcon);
        headerBox.append(new Gtk.Label({
            label: '<span size="xx-large" weight="bold">LLM Text Pro</span>',
            use_markup: true,
            halign: Gtk.Align.CENTER,
        }));
        headerBox.append(new Gtk.Label({
            label: `Version ${version}  ·  GNOME Shell ${shellVer}`,
            css_classes: ['dim-label'],
            halign: Gtk.Align.CENTER,
        }));
        headerBox.append(new Gtk.Label({
            label: 'Supercharge your clipboard with AI',
            css_classes: ['title-4'],
            halign: Gtk.Align.CENTER,
            margin_top: 4,
        }));
        headerRow.add_prefix(headerBox);
        headerGroup.add(headerRow);

        // ── How It Works ─────────────────────────────────────────────────────
        const howGroup = new Adw.PreferencesGroup({ title: 'How It Works' });
        page.add(howGroup);

        [
            ['1', 'Copy text to your clipboard',
             'Select any text in any app and press Ctrl+C'],
            ['2', 'Trigger an action',
             'Press a hotkey (e.g. Ctrl+Alt+G) or open the tray menu and click an action'],
            ['3', 'AI transforms your text',
             'The processed result is placed back on your clipboard'],
            ['4', 'Paste the result',
             'Press Ctrl+V anywhere — or enable Auto-paste to insert it automatically'],
        ].forEach(([num, title, subtitle]) => {
            const row = new Adw.ActionRow({ title, subtitle, activatable: false });
            row.add_prefix(new Gtk.Label({
                label: num,
                css_classes: ['title-3', 'accent'],
                valign: Gtk.Align.CENTER,
                width_chars: 2,
                halign: Gtk.Align.CENTER,
            }));
            howGroup.add(row);
        });

        // ── Features ─────────────────────────────────────────────────────────
        const featGroup = new Adw.PreferencesGroup({ title: 'Features' });
        page.add(featGroup);

        [
            ['document-edit-symbolic',       '16 built-in text actions',    'Grammar, improve, translate, summarise, reply, code refactor, and more'],
            ['list-add-symbolic',            'Fully customisable actions',   'Add, edit, reorder, or disable any action — with custom AI prompts'],
            ['computer-symbolic',            'Multiple AI backends',         'Local (Ollama / LM Studio), Gemini CLI, Claude CLI, and Copilot CLI'],
            ['security-medium-symbolic',     'Per-action backend override',  'Send sensitive text only to your local model, not a cloud API'],
            ['document-open-recent-symbolic','Transformation history',       'Re-copy any past result directly from the tray menu'],
            ['input-keyboard-symbolic',      'Global hotkeys',               'Trigger any action from anywhere without opening the tray'],
            ['edit-paste-symbolic',          'Auto-paste',                   'Processed text is pasted back into the active window automatically'],
        ].forEach(([icon, title, subtitle]) => {
            const row = new Adw.ActionRow({ title, subtitle, activatable: false });
            row.add_prefix(new Gtk.Image({
                icon_name: icon,
                pixel_size: 16,
                css_classes: ['dim-label'],
                valign: Gtk.Align.CENTER,
            }));
            featGroup.add(row);
        });

        // ── Default Hotkeys ───────────────────────────────────────────────────
        const hotkeyGroup = new Adw.PreferencesGroup({
            title: 'Default Hotkeys',
            description: 'All hotkeys can be changed or removed in the Actions page.',
        });
        page.add(hotkeyGroup);

        [
            ['Ctrl + Alt + G', 'Fix Grammar'],
            ['Ctrl + Alt + I', 'Improve Text'],
            ['Ctrl + Alt + H', 'Remove AI Patterns'],
            ['Ctrl + Alt + M', 'Reply to Message / Mail'],
            ['Ctrl + Alt + T', 'Translate DE ↔ EN'],
            ['Ctrl + Alt + P', 'Translate DE ↔ PL'],
            ['Ctrl + Alt + K', 'Write from Keywords'],
        ].forEach(([hotkey, action]) => {
            const row = new Adw.ActionRow({ title: action, activatable: false });
            row.add_prefix(new Gtk.Image({
                icon_name: 'input-keyboard-symbolic',
                pixel_size: 14,
                css_classes: ['dim-label'],
                valign: Gtk.Align.CENTER,
            }));
            const badge = new Gtk.Label({
                label: hotkey,
                css_classes: ['caption', 'monospace'],
                valign: Gtk.Align.CENTER,
            });
            row.add_suffix(badge);
            hotkeyGroup.add(row);
        });

        // ── Backend Setup ─────────────────────────────────────────────────────
        const setupGroup = new Adw.PreferencesGroup({
            title: 'Backend Quick Setup',
            description: 'Click a row to open the project page for installation instructions.',
        });
        page.add(setupGroup);

        const _openUrl = (url) => {
            try { Gtk.show_uri(null, url, GLib.CURRENT_TIME); }
            catch (e) { console.warn('[LLM Text Pro] Could not open URL:', e.message); }
        };

        [
            {
                title:    'Local — Ollama',
                subtitle: 'ollama serve  ·  Endpoint: http://127.0.0.1:11434/v1/chat/completions',
                icon:     'computer-symbolic',
                url:      'https://ollama.com',
            },
            {
                title:    'Local — LM Studio',
                subtitle: 'Start the LM Studio app  ·  Endpoint: http://127.0.0.1:1234/v1/chat/completions',
                icon:     'computer-symbolic',
                url:      'https://lmstudio.ai',
            },
            {
                title:    'Gemini CLI',
                subtitle: 'npm install -g @google/gemini-cli  →  run gemini once to authenticate',
                icon:     'applications-science-symbolic',
                url:      'https://github.com/google-gemini/gemini-cli',
            },
            {
                title:    'Claude CLI (Claude Code)',
                subtitle: 'Install from claude.ai/code  →  run claude once to authenticate',
                icon:     'applications-science-symbolic',
                url:      'https://claude.ai/code',
            },
            {
                title:    'Copilot CLI',
                subtitle: 'Install GitHub Copilot CLI  →  copilot auth login',
                icon:     'applications-science-symbolic',
                url:      'https://github.com/github/copilot-cli',
            },
        ].forEach(({ title, subtitle, icon, url }) => {
            const row = new Adw.ActionRow({ title, subtitle, activatable: true });
            row.add_prefix(new Gtk.Image({
                icon_name: icon,
                pixel_size: 16,
                css_classes: ['dim-label'],
                valign: Gtk.Align.CENTER,
            }));
            const linkBtn = new Gtk.Button({
                icon_name: 'go-next-symbolic',
                valign: Gtk.Align.CENTER,
                css_classes: ['flat'],
                tooltip_text: `Open: ${url}`,
            });
            linkBtn.connect('clicked', () => _openUrl(url));
            row.add_suffix(linkBtn);
            row.connect('activated', () => _openUrl(url));
            setupGroup.add(row);
        });

        // ── Tips ─────────────────────────────────────────────────────────────
        const tipsGroup = new Adw.PreferencesGroup({ title: 'Tips & Tricks' });
        page.add(tipsGroup);

        [
            ['dialog-information-symbolic',
             'Hotkey format',
             '<Control><Alt>g  or  <Shift><Super>t — combine any modifier keys'],
            ['accessories-dictionary-symbolic',
             'Custom translate pairs',
             'Edit the translate action prompt to support any language pair you need'],
            ['security-medium-symbolic',
             'Privacy-first',
             'Assign sensitive actions to the Local backend — they never leave your machine'],
            ['document-open-recent-symbolic',
             'Re-use results',
             'Click any history entry in the tray to copy that result back to the clipboard'],
        ].forEach(([icon, title, subtitle]) => {
            const row = new Adw.ActionRow({ title, subtitle, activatable: false });
            row.add_prefix(new Gtk.Image({
                icon_name: icon,
                pixel_size: 16,
                css_classes: ['dim-label'],
                valign: Gtk.Align.CENTER,
            }));
            tipsGroup.add(row);
        });

        // ── Credits ───────────────────────────────────────────────────────────
        const creditsGroup = new Adw.PreferencesGroup({ title: 'Credits' });
        page.add(creditsGroup);

        [
            ['avatar-default-symbolic',  'Author',    'David Sokolowski'],
            ['document-edit-symbolic',   'Based On',  'LLM Text Modifier by Rishabh Bajpai'],
            ['text-x-generic-symbolic',  'License',   'GNU General Public License v2 or later'],
        ].forEach(([icon, title, subtitle]) => {
            const row = new Adw.ActionRow({ title, subtitle, activatable: false });
            row.add_prefix(new Gtk.Image({
                icon_name: icon,
                pixel_size: 16,
                css_classes: ['dim-label'],
                valign: Gtk.Align.CENTER,
            }));
            creditsGroup.add(row);
        });

        return page;
    }
}
