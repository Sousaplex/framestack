# Building and Packaging FrameStack for Distribution

This guide covers building and packaging your Tauri app for distribution on macOS, Windows, and Linux.

## Prerequisites

1. **Install Tauri CLI and dependencies**:
   ```bash
   pnpm install
   ```

2. **Install platform-specific build tools**:
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
   - **Windows**: Microsoft Visual C++ Build Tools
   - **Linux**: `libwebkit2gtk-4.1-dev` and related build dependencies

## Configuration

Build and bundle configuration lives in `src-tauri/tauri.conf.json`. Key sections:

- `app.windows`: Window size, title, behavior
- `bundle.icon`: Icon files in `src-tauri/icons/`
- `bundle.macOS`: macOS-specific settings including signing identity

## Step 1: Build Icons

Ensure icon files exist in `src-tauri/icons/`:

```
src-tauri/icons/
├── 32x32.png
├── 128x128.png
├── 128x128@2x.png
├── icon.icns
└── icon.ico
```

You can generate these from a high-resolution source image using ImageMagick:

```bash
cd src-tauri/icons
magick icon.png -resize 32x32 32x32.png
magick icon.png -resize 128x128 128x128.png
magick icon.png -resize 256x256 128x128@2x.png
magick icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

## Step 2: Build and Package

### Development:
```bash
pnpm tauri dev
```

### Production build:
```bash
pnpm tauri build
```

### Platform-specific builds:

Tauri builds for the current platform by default. Cross-compilation requires additional setup.

**macOS**:
```bash
pnpm tauri build --target aarch64-apple-darwin
pnpm tauri build --target x86_64-apple-darwin
```

**Windows** (on Windows):
```bash
pnpm tauri build --target x86_64-pc-windows-msvc
```

**Linux** (on Linux):
```bash
pnpm tauri build --target x86_64-unknown-linux-gnu
```

## Step 3: Output Files

After packaging, you'll find distributable files in `src-tauri/target/release/bundle/`:

- **macOS**: `dmg/FrameStack_1.0.3_aarch64.dmg` and `macos/FrameStack.app`
- **Windows**: `msi/` and `nsis/` installers
- **Linux**: `appimage/` and `deb/` packages

## Important Notes

### 1. Code Signing (macOS)

For distribution outside the Mac App Store, code sign your app:

1. Get an Apple Developer account ($99/year)
2. Create a "Developer ID Application" certificate
3. Update `src-tauri/tauri.conf.json`:
   ```json
   "bundle": {
     "macOS": {
       "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
     }
   }
   ```

### 2. Notarization (macOS)

Required for macOS 10.15+ when distributing outside the App Store:

Set environment variables before building:
```bash
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

Then run:
```bash
pnpm tauri build
```

### 3. FFmpeg Dependency

**Important**: Your app requires users to install FFmpeg separately. Consider:

- **Option A**: Bundle FFmpeg as a Tauri sidecar (large app size, licensing considerations)
- **Option B**: Provide an installer that downloads FFmpeg
- **Option C**: Current approach - document requirement clearly and let users browse for FFmpeg

## Distribution Options

1. **Direct Download**: Host DMG/EXE/AppImage on your website
2. **GitHub Releases**: Upload to GitHub Releases
3. **Mac App Store**: Requires additional Tauri configuration
4. **Microsoft Store**: Requires additional configuration
5. **Homebrew Cask** (macOS): Create a cask formula

## Testing Before Distribution

1. **Test on clean systems**: Install on machines without Node.js/FFmpeg/Rust
2. **Test FFmpeg detection**: Ensure error messages work correctly
3. **Test all features**: File selection, rendering, job history
4. **Test on different OS versions**: macOS 11+, Windows 10+, Linux

## Troubleshooting

### Build fails with "icon not found"
- Ensure icon files exist in `src-tauri/icons/`
- Check paths in `src-tauri/tauri.conf.json`

### App crashes on launch
- Check console logs
- Verify the frontend built successfully in `dist/`
- Test with `pnpm tauri dev` first

### Large app size
- Tauri apps are already smaller than Electron equivalents
- Ensure unnecessary resources aren't bundled

## Next Steps

1. Install dependencies: `pnpm install`
2. Configure `src-tauri/tauri.conf.json`
3. Run `pnpm tauri dev` to test
4. Run `pnpm tauri build` to create distributable

For more details, see:
- [Tauri documentation](https://tauri.app/)
- [Tauri distribution guide](https://tauri.app/distribute/)
