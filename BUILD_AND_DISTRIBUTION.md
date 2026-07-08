# Building and Packaging Seq2Vid for Distribution

This guide covers building and packaging your Electron app for distribution on macOS, Windows, and Linux.

## Prerequisites

1. **Install electron-builder**:
   ```bash
   npm install --save-dev electron-builder
   ```

2. **Install platform-specific build tools** (if building for other platforms):
   - **macOS**: Already available on macOS
   - **Windows**: Requires Windows machine or Wine (for cross-compilation)
   - **Linux**: Already available on Linux

## Step 1: Configure electron-builder

Create an `electron-builder.yml` file in your project root:

```yaml
appId: com.seq2vid.app
productName: Seq2Vid
copyright: Copyright © 2024

directories:
  output: release/${version}
  buildResources: resources

files:
  - dist-electron/**
  - package.json
  - resources/**

asar: true
asarUnpack:
  - resources/**

mac:
  category: public.app-category.utilities
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  icon: resources/icon.icns
  entitlements: null
  entitlementsInherit: null

win:
  target:
    - target: nsis
      arch:
        - x64
  icon: resources/icon.ico  # You'll need to create this
  requestedExecutionLevel: asInvoker

linux:
  target:
    - target: AppImage
      arch:
        - x64
  category: Utility
  icon: resources/icon.png
```

## Step 2: Update package.json

Add build scripts and metadata to `package.json`:

```json
{
  "name": "seq2vid",
  "version": "1.0.0",
  "description": "Image sequence to video renderer with FFmpeg",
  "main": "dist-electron/main/index.js",
  "author": "Your Name",
  "license": "MIT",
  "homepage": "./",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "npm run build && electron-builder",
    "package:mac": "npm run build && electron-builder --mac",
    "package:win": "npm run build && electron-builder --win",
    "package:linux": "npm run build && electron-builder --linux"
  },
  "build": {
    "appId": "com.seq2vid.app",
    "productName": "Seq2Vid",
    "directories": {
      "output": "release/${version}",
      "buildResources": "resources"
    },
    "files": [
      "dist-electron/**",
      "package.json",
      "resources/**"
    ],
    "mac": {
      "category": "public.app-category.utilities",
      "target": ["dmg"],
      "icon": "resources/icon.icns"
    },
    "win": {
      "target": ["nsis"],
      "icon": "resources/icon.ico"
    },
    "linux": {
      "target": ["AppImage"],
      "category": "Utility",
      "icon": "resources/icon.png"
    }
  }
}
```

## Step 3: Create Windows Icon (if needed)

If you want to build for Windows, create an `.ico` file:

```bash
# Using ImageMagick (if installed)
convert resources/icon.png -define icon:auto-resize=256,128,64,48,32,16 resources/icon.ico

# Or use an online converter to convert PNG to ICO
```

## Step 4: Build and Package

### Build for Development/Testing:
```bash
npm run build
```

This creates optimized production builds in `dist-electron/` but doesn't create installers.

### Package for Distribution:

**All platforms** (from macOS, will create macOS build):
```bash
npm run package
```

**macOS only**:
```bash
npm run package:mac
```

**Windows only** (requires Windows or Wine):
```bash
npm run package:win
```

**Linux only**:
```bash
npm run package:linux
```

## Step 5: Output Files

After packaging, you'll find distributable files in `release/{version}/`:

- **macOS**: `Seq2Vid-{version}.dmg`
- **Windows**: `Seq2Vid Setup {version}.exe`
- **Linux**: `Seq2Vid-{version}.AppImage`

## Important Notes

### 1. Code Signing (macOS)

For distribution outside the Mac App Store, you'll need to code sign:

1. Get an Apple Developer account ($99/year)
2. Create certificates in Xcode or Apple Developer portal
3. Add to `electron-builder.yml`:
   ```yaml
   mac:
     identity: "Developer ID Application: Your Name (TEAM_ID)"
     hardenedRuntime: true
     gatekeeperAssess: false
   ```

### 2. Notarization (macOS)

Required for macOS 10.15+:

```yaml
mac:
  notarize:
    teamId: YOUR_TEAM_ID
```

### 3. Windows Code Signing

Optional but recommended:

```yaml
win:
  signingHashAlgorithms: ['sha256']
  certificateFile: path/to/certificate.pfx
  certificatePassword: your_password
```

### 4. FFmpeg Dependency

**Important**: Your app requires users to install FFmpeg separately. Consider:

- **Option A**: Bundle FFmpeg (large app size, licensing considerations)
- **Option B**: Provide installer that downloads FFmpeg
- **Option C**: Current approach - document requirement clearly

### 5. Auto-Updates

To add auto-updates, consider:
- **electron-updater** (works with electron-builder)
- **Squirrel.Windows** (Windows)
- **Sparkle** (macOS)

## Distribution Options

1. **Direct Download**: Host DMG/EXE/AppImage on your website
2. **GitHub Releases**: Upload to GitHub Releases
3. **Mac App Store**: Requires additional configuration
4. **Microsoft Store**: Requires additional configuration
5. **Homebrew Cask** (macOS): Create a cask formula

## Testing Before Distribution

1. **Test on clean systems**: Install on machines without Node.js/FFmpeg
2. **Test FFmpeg detection**: Ensure error messages work correctly
3. **Test all features**: File selection, rendering, job history
4. **Test on different OS versions**: macOS 11+, Windows 10+, Linux

## Troubleshooting

### Build fails with "icon not found"
- Ensure icon files exist in `resources/` directory
- Check paths in `electron-builder.yml`

### App crashes on launch
- Check console logs
- Verify all dependencies are included
- Test with `npm run preview` first

### Large app size
- Use `asar: true` to compress files
- Exclude unnecessary files in `files` array
- Consider code splitting

## Next Steps

1. Install electron-builder: `npm install --save-dev electron-builder`
2. Create `electron-builder.yml` configuration
3. Update `package.json` with build scripts
4. Run `npm run build` to test production build
5. Run `npm run package` to create distributable

For more details, see:
- [electron-builder documentation](https://www.electron.build/)
- [electron-vite distribution guide](https://electron-vite.org/guide/distribution.html)
