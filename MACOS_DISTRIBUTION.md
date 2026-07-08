# macOS Distribution Guide

## Issue: "The application can't be opened"

This error occurs because the app isn't code signed. macOS Gatekeeper blocks unsigned apps by default.

## Immediate Solution (For Users)

Tell your friend to:

1. **Right-click** the `Seq2Vid.app` file (or Control+Click)
2. Select **"Open"** from the context menu
3. Click **"Open"** in the security dialog

This bypasses Gatekeeper for this specific app.

Alternatively:
1. Go to **System Settings** → **Privacy & Security**
2. Scroll down to find the blocked app message
3. Click **"Open Anyway"**

## Proper Solution: Code Signing

For distribution, you should code sign your app. Here are your options:

### Option 1: Free Ad-Hoc Signing (For Testing)

This allows the app to run but won't pass Gatekeeper on other machines:

```bash
# Sign the app with ad-hoc signature
codesign --force --deep --sign - Seq2Vid.app
```

### Option 2: Apple Developer Account ($99/year)

For proper distribution, you need an Apple Developer account:

1. **Get Apple Developer Account**: https://developer.apple.com/programs/
2. **Create Certificates**:
   - Go to Apple Developer Portal → Certificates
   - Create "Developer ID Application" certificate
   - Download and install in Keychain

3. **Update `electron-builder.yml`**:

```yaml
mac:
  category: public.app-category.utilities
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  icon: resources/icon.icns
  identity: "Developer ID Application: Your Name (TEAM_ID)"
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: null
  entitlementsInherit: null
```

4. **Set Environment Variables** (if needed):

```bash
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

5. **Rebuild**:

```bash
npm run build
npm run package:mac
```

### Option 3: Notarization (Required for macOS 10.15+)

After code signing, you should also notarize:

```yaml
mac:
  # ... other settings ...
  notarize:
    teamId: YOUR_TEAM_ID
```

This requires:
- Apple Developer account
- App-specific password (create at appleid.apple.com)
- Team ID from developer portal

## Quick Fix: Update electron-builder.yml

For now, add this to allow unsigned apps to be distributed (users will still need to bypass Gatekeeper):

```yaml
mac:
  category: public.app-category.utilities
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  icon: resources/icon.icns
  hardenedRuntime: false  # Disable hardened runtime for unsigned apps
  gatekeeperAssess: false  # Skip Gatekeeper assessment
  entitlements: null
  entitlementsInherit: null
```

## Distribution Without Code Signing

If you can't code sign, you can:

1. **Distribute as ZIP** instead of DMG:
   - Users extract ZIP
   - Right-click → Open (bypasses Gatekeeper)

2. **Provide clear instructions** in your README:
   ```
   macOS users: After downloading, right-click Seq2Vid.app and select "Open"
   ```

3. **Use Homebrew Cask** (requires code signing):
   - Create a cask formula
   - Users install via `brew install --cask seq2vid`

## Testing

Before distributing:

1. Test on a clean macOS machine (without your dev environment)
2. Test both Intel (x64) and Apple Silicon (arm64) builds
3. Verify Gatekeeper behavior
4. Test FFmpeg detection

## Current Status

Your app is currently **unsigned**. Users will need to bypass Gatekeeper manually.
