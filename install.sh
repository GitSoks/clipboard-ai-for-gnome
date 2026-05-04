#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

EXT_UUID="llm-text-pro@sokolowski.tech"
ZIP_NAME="${EXT_UUID}.zip"

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Error: required command '$1' was not found in PATH." >&2
        exit 1
    fi
}

cleanup() {
    rm -f "$ZIP_NAME"
}

trap cleanup EXIT

# Files required in the extension ZIP
FILES=(
    extension.js
    metadata.json
    prefs.js
    stylesheet.css
    schemas
    icons
)

require_command glib-compile-schemas
require_command gnome-extensions
require_command python3

echo "Compiling schemas..."
glib-compile-schemas schemas/

echo "Packaging extension..."
python3 -m zipfile -c "$ZIP_NAME" "${FILES[@]}"

echo "Installing extension..."
gnome-extensions install --force "$ZIP_NAME"

echo "Reloading extension in GNOME Shell..."
gnome-extensions disable "$EXT_UUID" || true
sleep 1
gnome-extensions enable "$EXT_UUID" || true

echo "Done! (If you are on Wayland and UI changes don't appear, you may still need to log out and log back in.)"
