# LLM Text Pro

✨ **Supercharge your clipboard with AI!** ✨

LLM Text Pro is a powerful, customizable GNOME Shell Extension that lets you instantly transform your clipboard text using AI. Whether you need to fix grammar, rewrite text, translate languages, or run custom prompts, you can do it all with a simple hotkey—without ever leaving your current window.

![Version](https://img.shields.io/badge/version-11-blue.svg)
![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-45%20%7C%2046%20%7C%2047%20%7C%2048%20%7C%2049%20%7C%2050-brightgreen.svg)
![License](https://img.shields.io/badge/license-GPLv3-green.svg)

## Features

- **7 AI Backends:** Seamlessly switch between Local AI (Ollama, LM Studio), **Online API** (OpenRouter, OpenAI, Groq, Together AI, Mistral — any OpenAI-compatible cloud endpoint), Google's **Gemini CLI**, Anthropic's **Claude CLI**, GitHub's **Copilot CLI**, OpenAI's **Codex CLI**, and **OpenCode CLI**.
- **Auto-Action on Copy:** Automatically trigger any action whenever you copy text to the clipboard — no hotkey needed. Includes debouncing and smart suppression to prevent recursive loops.
- **Live Status & Usage Tracking:** The animated tray icon displays real-time processing status, with per-backend usage stats (tokens, cost, call count) tracked in the tray menu.
- **Auto-Start Local Servers:** Optionally configure the extension to automatically start your LM Studio server in the background if a local AI request fails.
- **Dynamic Model Selection:** Fetch available models from your Local AI instance or OpenCode CLI, or choose from up-to-date presets for Gemini, Claude, Copilot, and Codex. Supports `Default (Auto)` to defer to your CLI's native configuration.
- **Customizable Actions:** Create unlimited custom prompts (e.g., "Summarize", "Refactor Code", "Translate to French") and assign global GNOME hotkeys to them.
- **Per-Action Overrides:** Want your grammar check to use a fast local model, but your complex coding questions to use Claude? You can override the global backend on a per-action basis.
- **Auto-Paste:** Optionally simulate `Ctrl+V` to automatically paste the AI's response back into your active window.
- **Transformation History:** Keeps a rolling history of your recent transformations accessible from the tray menu, allowing you to instantly re-copy past results.
- **Action Queueing:** If you trigger a new action while one is processing, it gets queued (up to 5) and runs automatically when the current action finishes.

## Installation

### Prerequisites

Depending on which backend you want to use, you will need the corresponding tool installed:

- **Local API:** [Ollama](https://ollama.com/) or [LM Studio](https://lmstudio.ai/) running locally (or any reachable OpenAI-compatible endpoint). Can be disabled in settings.
- **Online API:** Any OpenAI-compatible cloud endpoint — [OpenRouter](https://openrouter.ai/), [OpenAI](https://platform.openai.com/), [Groq](https://groq.com/), [Together AI](https://together.ai/), or [Mistral](https://mistral.ai/). Just enter an API key to enable.
- **Gemini CLI:** Install via npm: `npm install -g @google/gemini-cli` and run `gemini` once to authenticate.
- **Claude CLI:** Install via npm: `npm install -g @anthropic-ai/claude-code` and run `claude` once to authenticate.
- **Copilot CLI:** Install the GitHub Copilot CLI and run `copilot login` to authenticate.
- **Codex CLI:** Install via npm: `npm install -g @openai/codex` and run `codex login` to authenticate. Optionally set `CODEX_API_KEY`.
- **OpenCode CLI:** Install via npm: `npm install -g opencode` and run `opencode providers` to configure your AI providers.

### Quick Install (From Source)

```bash
# Clone and install
git clone https://git.sokolowski.tech/david/llm-text-pro@sokolowski.tech.git
cd llm-text-pro@sokolowski.tech
bash install.sh
```

### Manual Installation

1. Clone this repository into your GNOME extensions directory:
   ```bash
   git clone https://git.sokolowski.tech/david/llm-text-pro@sokolowski.tech.git ~/.local/share/gnome-shell/extensions/llm-text-pro@sokolowski.tech
   ```
2. Compile the settings schema:
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/llm-text-pro@sokolowski.tech/schemas/
   ```
3. Restart GNOME Shell:
   - **X11:** Press `Alt+F2`, type `r`, and press `Enter`.
   - **Wayland:** Log out and log back into your session.
4. Enable the extension via the **Extensions** app or terminal:
   ```bash
   gnome-extensions enable llm-text-pro@sokolowski.tech
   ```

## Configuration

Open the **Extension Settings** (via the Extensions app or the tray menu) to configure:

1. **Backend:** Choose your default active AI — click any backend card to switch. Each card shows install status and the active selection.
2. **API/CLI Settings:** Set your Local API endpoint, API key, and select your preferred models. OpenCode models are auto-fetched from the CLI.
3. **Actions:** Add, edit, or remove your text transformation prompts and assign hotkeys.
4. **General:** Toggle Auto-Paste, Auto-Action on Copy, Desktop Notifications, and Periodic Quota Checks.

## Usage

1. **Highlight and Copy** the text you want to transform (e.g., `Ctrl+C`).
2. Press the **Hotkey** assigned to your desired action (e.g., `Ctrl+Alt+G` for Fix Grammar).
3. The tray icon will spin (`⠋ ⠙ ⠹...`) indicating processing.
4. Once complete, you will receive a native notification showing the model used and token count. The transformed text is now in your clipboard (or auto-pasted if enabled).

### Auto-Action on Copy

Enable "Auto-Action on Copy" in the tray menu to automatically trigger a selected action whenever you copy new text. This is useful for workflows where you always want a specific transformation applied (e.g., grammar fix or translation).

## Default Hotkeys

| Hotkey            | Action                  |
|-------------------|-------------------------|
| `Ctrl + Alt + G`  | Fix Grammar             |
| `Ctrl + Alt + I`  | Improve Text            |
| `Ctrl + Alt + H`  | Remove AI Patterns      |
| `Ctrl + Alt + M`  | Reply to Message / Mail |
| `Ctrl + Alt + T`  | Translate DE ↔ EN       |
| `Ctrl + Alt + P`  | Translate DE ↔ PL       |
| `Ctrl + Alt + K`  | Write from Keywords     |

All hotkeys can be changed or removed in the **Actions** settings page.

## Acknowledgements & Citations

LLM Text Pro is a major architectural overhaul and feature expansion built by **David Sokolowski**. 

It is proudly based upon the foundational concepts of the original **[LLM Text Modifier](https://github.com/rishabhbajpai/llm-text-modifier)** extension created by [Rishabh Bajpai](https://rishabhbajpai24.com). The original project provided the excellent groundwork for clipboard manipulation and basic API interactions within the GNOME Shell environment. 

This expanded "Pro" fork introduces:
- Support for 6 CLI-based and API backends (Local, Gemini, Claude, Copilot, Codex, OpenCode).
- Auto-action on copy with smart clipboard monitoring and debouncing.
- Advanced JSON/JSONL parsing for token and model tracking across all backends.
- Dynamic model fetching from Local API and OpenCode CLI.
- Live local model fetching and top-bar status indicators.
- A completely redesigned UI with native GNOME icons and CSS animations.
- Per-backend usage tracking (tokens, cost, call count).
- Action queueing (up to 5 concurrent requests).

## License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**. 

See the [LICENSE](LICENSE) file for details. This ensures the extension remains free and open-source, aligning with the GNOME project's philosophy.