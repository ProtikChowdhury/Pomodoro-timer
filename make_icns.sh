#!/bin/bash
# Script to convert png to icns
SRC_ICON="$1"
ICONSET_DIR="FocusFlow.iconset"

mkdir -p "$ICONSET_DIR"

# Generate sizes with correct format settings for sips
sips -s format png -z 16 16     "$SRC_ICON" --out "$ICONSET_DIR/icon_16x16.png"
sips -s format png -z 32 32     "$SRC_ICON" --out "$ICONSET_DIR/icon_16x16@2x.png"
sips -s format png -z 32 32     "$SRC_ICON" --out "$ICONSET_DIR/icon_32x32.png"
sips -s format png -z 64 64     "$SRC_ICON" --out "$ICONSET_DIR/icon_32x32@2x.png"
sips -s format png -z 128 128   "$SRC_ICON" --out "$ICONSET_DIR/icon_128x128.png"
sips -s format png -z 256 256   "$SRC_ICON" --out "$ICONSET_DIR/icon_128x128@2x.png"
sips -s format png -z 256 256   "$SRC_ICON" --out "$ICONSET_DIR/icon_256x256.png"
sips -s format png -z 512 512   "$SRC_ICON" --out "$ICONSET_DIR/icon_256x256@2x.png"
sips -s format png -z 512 512   "$SRC_ICON" --out "$ICONSET_DIR/icon_512x512.png"
sips -s format png -z 1024 1024 "$SRC_ICON" --out "$ICONSET_DIR/icon_512x512@2x.png"

# Convert to valid icns
iconutil -c icns "$ICONSET_DIR"

# Move to App Bundle
mv FocusFlow.icns "Focus Flow.app/Contents/Resources/applet.icns"
touch "Focus Flow.app"

# Cleanup
rm -rf "$ICONSET_DIR"
