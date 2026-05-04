<p align="center">
  <img src="icons/logo.svg" width="120" height="120" alt="LLM Text Pro Logo">
</p>

<h1 align="center">LLM Text Pro</h1>

<p align="center">
  <strong>AI-powered clipboard actions for GNOME Shell</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-11-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/GNOME%20Shell-48%20%7C%2049%20%7C%2050-brightgreen.svg" alt="GNOME Shell">
  <img src="https://img.shields.io/badge/license-GPLv3-green.svg" alt="License">
</p>

<p align="center">
  Transform copied text anywhere on your desktop with a hotkey or automatic workflow — without switching apps.
</p>

---

## Overview

**LLM Text Pro** is a GNOME Shell extension for instant text transformation. Copy text, trigger an action, and get the rewritten result back on your clipboard — or pasted straight into the focused app.

It is designed for real desktop use: quick grammar fixes, translation, tone adjustment, drafting replies, summarising long text, and even code explanation or refactoring.

## Highlights

- **7 AI backends**: Local API, Online API, Gemini CLI, Claude CLI, Copilot CLI, Codex CLI, and OpenCode CLI.
- **16 built-in actions** plus unlimited custom prompts.
- **Per-action backend routing** so each action can use a different model or provider.
- **Auto-action on copy** with debouncing and loop prevention.
- **Auto-paste support** to put results directly into the active window.
- **Live tray status, history, and usage tracking** for a smoother day-to-day workflow.
- **Optional LM Studio auto-start** when the local backend is unavailable.

## Compatibility

- **GNOME Shell:** 48, 49, 50
- **Platform:** Linux desktop with GNOME Shell
- **Backends:** At least one supported local, cloud, or CLI backend configured

## Supported backends

| Backend | Type | Notes |
| --- | --- | --- |
| **Local API** | Local | Works with Ollama or LM Studio via an OpenAI-compatible endpoint |
| **Online API** | Cloud | Supports OpenRouter, OpenAI, Groq, Together AI, Mistral, and other compatible APIs |
| **Gemini CLI** | CLI | Uses Google's Gemini command-line tool |
| **Claude CLI** | CLI | Uses Anthropic Claude Code |
| **Copilot CLI** | CLI | Uses GitHub Copilot CLI |
| **Codex CLI** | CLI | Uses OpenAI Codex CLI |
| **OpenCode CLI** | CLI | Uses OpenCode models and provider configuration |

## Installation

### Prerequisites

Install and authenticate the backend(s) you want to use:

| Backend | Install | Auth / setup |
| --- | --- | --- |
| **Local API** | [Ollama](https://ollama.com/) or [LM Studio](https://lmstudio.ai/) | Start a compatible local server |
| **Online API** | OpenRouter / OpenAI-compatible provider | Add an API key in extension settings |
| **Gemini CLI** | `npm install -g @google/gemini-cli` | Run `gemini` once |
| **Claude CLI** | Install from [claude.ai/code](https://claude.ai/code) | Run `claude` once |
| **Copilot CLI** | Install GitHub Copilot CLI | Run `copilot login` |
| **Codex CLI** | `npm install -g @openai/codex` | Run `codex login` or set `CODEX_API_KEY` |
| **OpenCode CLI** | `npm install -g opencode` | Configure providers with `opencode providers` |

### Quick install

```bash
git clone https://github.com/GitSoks/llm-text-pro.git
cd llm-text-pro
bash install.sh
```

The installer will:

1. compile the GNOME schema,
2. build a temporary extension ZIP,
3. install or update the extension with `gnome-extensions`,
4. reload the extension, and
5. clean up the temporary archive.

### Manual installation

```bash
git clone https://github.com/GitSoks/llm-text-pro.git \
  ~/.local/share/gnome-shell/extensions/llm-text-pro@sokolowski.tech

glib-compile-schemas \
  ~/.local/share/gnome-shell/extensions/llm-text-pro@sokolowski.tech/schemas/

gnome-extensions enable llm-text-pro@sokolowski.tech
```

If you are on **Wayland**, you may need to log out and back in after first install.

## First-time setup

Open **Extension Settings** from the Extensions app or the top-panel menu, then:

1. choose the backend you want to use,
2. configure its endpoint, binary path, model, or API key,
3. review the built-in actions,
4. assign your preferred global hotkeys, and
5. optionally enable auto-paste, history, and auto-action on copy.

## Usage

1. **Copy** any text.
2. **Trigger** an action from a hotkey or the panel menu.
3. **Wait** for the tray indicator to finish processing.
4. **Paste** the transformed text manually, or let auto-paste do it for you.

### Auto-action on copy

You can configure one action to run automatically every time text is copied.

> **Note**
> For privacy and safety, automatic clipboard processing only runs when the resolved backend is **Local API**.

## Built-in actions

The extension ships with 16 ready-to-use actions:

- Fix Grammar
- Improve Text
- Remove AI Patterns
- Make Professional
- Make Casual
- Fix Tone
- Reply to Message / Mail
- Translate DE ↔ EN
- Translate DE ↔ PL
- Summarize
- Bullet Points
- Write from Keywords
- Expand Text
- Add Emojis
- Explain Code
- Refactor Code

All prompts are fully editable, and you can add as many custom actions as you want.

## Recommended hotkeys

No default hotkeys are enforced, but these are sensible starting points:

| Hotkey | Action |
| --- | --- |
| `Ctrl+Alt+G` | Fix Grammar |
| `Ctrl+Alt+I` | Improve Text |
| `Ctrl+Alt+H` | Remove AI Patterns |
| `Ctrl+Alt+M` | Reply to Message / Mail |
| `Ctrl+Alt+T` | Translate DE ↔ EN |
| `Ctrl+Alt+P` | Translate DE ↔ PL |
| `Ctrl+Alt+K` | Write from Keywords |

## Privacy and data flow

- **Local API** keeps processing on your machine.
- **Online API** and **CLI backends** may send text to external services according to their provider behavior and account configuration.
- **History** and **usage stats** are stored locally in your user data directory.
- **Auto-action on copy** is limited to the local backend path by design.

## Development notes

Useful files in this repository:

- `extension.js` — tray indicator, clipboard workflow, backend dispatch, history, and usage tracking
- `prefs.js` — Adwaita preferences UI, backend setup, action editor, and history viewer
- `schemas/` — GNOME settings schema
- `icons/` — backend and branding icons
- `install.sh` — local packaging and install helper

For local iteration, `bash install.sh` is the main workflow.

## Brand icons

The extension uses custom icons for each supported backend in both the preferences UI and the top-panel menu:

<p align="center">
  <img src="icons/ollama-symbolic.svg" width="32" alt="Local AI"> &nbsp;
  <img src="icons/open-webui-symbolic.svg" width="32" alt="Online API"> &nbsp;
  <img src="icons/gemini-symbolic.svg" width="32" alt="Gemini"> &nbsp;
  <img src="icons/claude-symbolic.svg" width="32" alt="Claude"> &nbsp;
  <img src="icons/copilot-symbolic.svg" width="32" alt="Copilot"> &nbsp;
  <img src="icons/codex-symbolic.svg" width="32" alt="Codex"> &nbsp;
  <img src="icons/opencode-symbolic.svg" width="32" alt="OpenCode">
</p>

## Acknowledgements

**LLM Text Pro** is based on **[LLM Text Modifier](https://github.com/rishabhbajpai/llm-text-modifier)** by [Rishabh Bajpai](https://rishabhbajpai24.com), extended with multi-backend support, richer UI, queueing, usage tracking, history, and desktop-focused automation.

## License

Licensed under the **GNU General Public License v3.0 (GPLv3)**. See [LICENSE](LICENSE).