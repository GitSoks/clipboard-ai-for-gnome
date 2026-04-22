#!/bin/bash
set -e

EXT_UUID="llm-text-pro@sokolowski.at"
ZIP_NAME="llm-text-pro-updated.zip"

echo "Compiling schemas..."
glib-compile-schemas schemas/

echo "Packaging extension..."
rm -f "$ZIP_NAME"
python3 -m zipfile -c "$ZIP_NAME" *

echo "Installing extension..."
gnome-extensions install --force "$ZIP_NAME"

echo "Reloading extension in GNOME Shell..."
gnome-extensions disable "$EXT_UUID"
sleep 1
gnome-extensions enable "$EXT_UUID"

echo "Cleanup..."
rm -f "$ZIP_NAME"

echo "Done! (If you are on Wayland and UI changes don't appear, you may still need to log out and log back in.)"
