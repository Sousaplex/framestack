# FrameStack Installation Instructions

## For macOS Users

### Step 1: Download the DMG
Download `FrameStack-1.0.2-arm64.dmg` (for M1/M2/M3 Macs) or `FrameStack-1.0.2.dmg` (for Intel Macs)

### Step 2: Open the DMG
Double-click the DMG file to mount it

### Step 3: Install the App
Drag `FrameStack.app` to your Applications folder

### Step 4: Remove Quarantine Attribute (IMPORTANT!)

Since the app isn't code signed, macOS may mark it as "damaged". To fix this:

1. **Open Terminal** (Applications → Utilities → Terminal)

2. **Run this command:**
   ```bash
   xattr -cr /Applications/FrameStack.app
   ```

3. **Press Enter** and wait for the command to complete (no output means success)

### Step 5: Open the App

1. **Right-click** on `FrameStack.app` in Applications
2. Select **"Open"** from the menu
3. Click **"Open"** in the security dialog

The app should now launch successfully!

## Alternative: If Right-Click Doesn't Work

If you still get an error, try:

1. Open **System Settings** → **Privacy & Security**
2. Scroll down to find the blocked app message
3. Click **"Open Anyway"**

## Troubleshooting

**"App is damaged" error:**
- Run the `xattr -cr` command above
- Make sure you're using the correct architecture version (ARM64 for M1/M2/M3, x64 for Intel)

**"App can't be opened" error:**
- Right-click → Open (bypasses Gatekeeper)
- Or use System Settings → Privacy & Security → Open Anyway

## Requirements

- macOS 10.15 or later
- FFmpeg installed separately (the app will guide you if it's missing)

