# Application Icons

Place your application icon files in this directory.

## Supported Formats

- **macOS**: `icon.icns` (recommended) or `icon.png`
- **Windows**: `icon.ico` (recommended) or `icon.png`
- **Linux**: `icon.png` (recommended)

## File Naming

The app will automatically look for icons in this order:
1. `icon.png`
2. `icon.icns` (macOS)
3. `icon.jpeg` or `icon.jpg`

## Converting JPEG to PNG/ICNS

If you have a JPEG logo, you can convert it:

### To PNG (for all platforms):
```bash
# Using ImageMagick
convert your-logo.jpeg -resize 512x512 icon.png

# Or using sips on macOS
sips -s format png your-logo.jpeg --out icon.png
```

### To ICNS (for macOS):
```bash
# First create PNG at multiple sizes, then use iconutil
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o icon.icns
```

## Quick Setup

For now, you can simply:
1. Copy your JPEG logo to this folder
2. Rename it to `icon.jpeg` or `icon.png`
3. The app will automatically use it
