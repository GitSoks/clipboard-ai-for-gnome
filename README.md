# LLM Text Pro

✨ **Supercharge your clipboard with AI!** ✨

LLM Text Pro is a powerful, customizable GNOME Shell Extension that lets you instantly transform your clipboard text using AI. Whether you need to fix grammar, rewrite text, translate languages, or run custom prompts, you can do it all with a simple hotkey—without ever leaving your current window.

![Version](https://img.shields.io/badge/version-9-blue.svg)
![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-45%20%7C%2046%20%7C%2047%20%7C%2048%20%7C%2049%20%7C%2050-brightgreen.svg)
![License](https://img.shields.io/badge/license-GPLv3-green.svg)

## Features

- **Multiple AI Backends:** Seamlessly switch between Local AI (Ollama, LM Studio, or any OpenAI-compatible API), Google's **Gemini CLI**, and Anthropic's **Claude CLI**.
- **Live Status & Quota Monitoring:** The animated tray icon displays real-time processing status. It also features a built-in background quota checker that silently pings your API to warn you if you hit rate limits, and dynamically displays loaded local models right in your top bar!
- **Dynamic Model Selection:** Easily fetch available models from your Local AI instance, or choose from up-to-date presets for Gemini and Claude. Supports `Default (Auto)` to defer to your CLI's native configuration.
- **Customizable Actions:** Create unlimited custom prompts (e.g., "Summarize", "Make Formal", "Translate to French") and assign global GNOME hotkeys to them.
- **Per-Action Overrides:** Want your grammar check to use a fast local model, but your complex coding questions to use Claude 3.5 Sonnet? You can override the global backend on a per-action basis.
- **Auto-Paste:** Optionally simulate `Ctrl+V` to automatically paste the AI's response back into your active window.
- **Transformation History:** Keeps a rolling history of your recent transformations accessible from the tray menu, allowing you to instantly re-copy past results.

## Installation

### Prerequisites

Depending on which backend you want to use, you will need the corresponding tool installed:

- **Local API:** [Ollama](https://ollama.com/) or [LM Studio](https://lmstudio.ai/) running locally (or any reachable OpenAI-compatible endpoint).
- **Gemini CLI:** Install via npm: `npm install -g @google/gemini-cli` and run `gemini` once to authenticate.
- **Claude CLI:** Install via npm: `npm install -g @anthropic-ai/claude-code` and run `claude` once to authenticate.

### Manual Installation (From Source)

1. Clone this repository into your GNOME extensions directory:
   ```bash
   git clone https://git.sokolowski.tech/david/llm-text-pro.git ~/.local/share/gnome-shell/extensions/llm-text-pro@sokolowski.at
   ```
2. Compile the settings schema:
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/llm-text-pro@sokolowski.at/schemas/
   ```
3. Restart GNOME Shell:
   - **X11:** Press `Alt+F2`, type `r`, and press `Enter`.
   - **Wayland:** Log out and log back into your session.
4. Enable the extension via the **Extensions** app or terminal:
   ```bash
   gnome-extensions enable llm-text-pro@sokolowski.at
   ```

## Configuration

Open the **Extension Settings** (via the Extensions app or the tray menu) to configure:

1. **Backend:** Choose your default active AI.
2. **API/CLI Settings:** Set your Local API endpoint, API key, and select your preferred models.
3. **Actions:** Add, edit, or remove your text transformation prompts and assign hotkeys.
4. **General:** Toggle Auto-Paste, Desktop Notifications, and Periodic Quota Checks.

## Usage

1. **Highlight and Copy** the text you want to transform (e.g., `Ctrl+C`).
2. Press the **Hotkey** assigned to your desired action (e.g., `<Control><Super>o` for Fix Grammar).
3. The tray icon will spin (`⠋ ⠙ ⠹...`) indicating processing.
4. Once complete, you will receive a native notification showing the model used and token count. The transformed text is now in your clipboard (or auto-pasted if enabled).

## Acknowledgements & Citations

LLM Text Pro (v8/v9) is a major architectural overhaul and feature expansion built by **David Sokolowski**. 

It is proudly based upon the foundational concepts of the original **[LLM Text Modifier](https://github.com/rishabhbajpai/llm-text-modifier)** extension created by [Rishabh Bajpai](https://rishabhbajpai24.com). The original project provided the excellent groundwork for clipboard manipulation and basic API interactions within the GNOME Shell environment. 

This expanded "Pro" fork introduces:
- Support for CLI-based backends (Gemini/Claude).
- Advanced JSON parsing for token and model tracking.
- Live local model fetching and top-bar status indicators.
- A completely redesigned UI with Native GNOME icons and CSS animations.
- Background API Quota monitoring.

## License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**. 

See the [LICENSE](LICENSE) file for details. This ensures the extension remains free and open-source, aligning with the GNOME project's philosophy.