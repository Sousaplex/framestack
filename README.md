# FrameStack - Image Sequence Renderer

A Tauri application for converting image sequences to high-quality video formats using FFmpeg.

## Features

- **Image Sequence Import**: Import PNG, TIFF, EXR, JPEG, and DPX image sequences
- **High-End Formats**: Support for DNxHD, DNxHR, ProRes4444, ProRes422, H.264, H.265, CineForm, and AV1
- **Alpha Channel Support**: Automatic detection and support for alpha channels
- **Job History**: Keep track of recent render jobs with ability to reuse settings
- **Smart Naming**: Automatic output file naming suggestions based on input sequence
- **File System Navigation**: Easy directory browsing and folder creation
- **Real-time Progress**: Live progress tracking with frame count, FPS, and ETA

## Download

Grab the latest installer from the [**Releases**](https://github.com/Sousaplex/framestack/releases) page:

- **macOS**: `.dmg` (universal — Apple Silicon + Intel)
- **Windows**: `.msi` or `.exe`

> **FFmpeg is required** and is not bundled — install it separately (see
> [Prerequisites](#prerequisites)).
>
> These builds are **not code-signed**. On first launch:
> - **macOS**: right-click the app and choose *Open* (Gatekeeper will otherwise
>   block an unidentified developer).
> - **Windows**: on the SmartScreen prompt, click *More info → Run anyway*.

## Prerequisites

- **FFmpeg**: Must be installed and available in your system PATH
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt-get install ffmpeg` or `sudo yum install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

- **Node.js**: Version 18 or higher
- **Rust**: Required by Tauri. Install via [rustup.rs](https://rustup.rs/)

## Build from Source

1. Install dependencies:
```bash
pnpm install
```

2. Start development server:
```bash
pnpm tauri dev
```

3. Build for production:
```bash
pnpm tauri build
```

Production installers are produced under `src-tauri/target/release/bundle/`.
Releases are built automatically for macOS and Windows by the
[release workflow](.github/workflows/release.yml) when a `v*` tag is pushed.

## Usage

1. **Select Image Sequence**: Click "Select Images" and choose your image sequence files
2. **Choose Format**: Select your desired output format (ProRes4444 recommended for alpha channels)
3. **Set Output Path**: Choose where to save the rendered video, or use smart naming suggestions
4. **Start Render**: Click "Start Render" to begin encoding
5. **Monitor Progress**: Watch real-time progress with frame count and ETA
6. **View History**: Access recent jobs from the history sidebar

## Supported Formats

### Input
- PNG (with alpha support)
- TIFF/TIF (with alpha support)
- EXR (with alpha support)
- JPEG
- DPX

### Output
- **DNxHD**: 220Mbps, MOV container
- **DNxHR HQX**: High quality profile, MOV container
- **ProRes 4444**: With alpha channel support, MOV container
- **ProRes 422**: High quality, MOV container
- **H.264**: High quality (CRF 18), MP4 container
- **H.265**: High quality (CRF 18), MP4 container
- **CineForm**: High quality, AVI container
- **AV1**: High quality (CRF 30), MP4 container

## Project Structure

```
framestack/
├── src/
│   ├── renderer/          # React UI
│   │   ├── App.tsx        # Main app component
│   │   ├── components/    # UI components
│   │   ├── hooks/         # React hooks
│   │   ├── api.ts         # Tauri API wrapper
│   │   └── utils/         # Utility functions
│   └── shared/            # Shared types and constants
│       ├── types.ts       # TypeScript types
│       └── formats.ts     # Video format definitions
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs        # Application entry
│   │   ├── lib.rs         # Tauri setup and commands
│   │   ├── commands.rs    # Tauri command handlers
│   │   ├── ffmpeg.rs      # FFmpeg discovery and rendering
│   │   ├── sequence.rs    # Sequence detection
│   │   ├── zip_extract.rs # ZIP extraction
│   │   └── store.rs       # Persistent storage
│   ├── capabilities/      # Tauri permissions
│   ├── icons/             # App icons
│   └── tauri.conf.json    # Tauri configuration
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Development

The app uses:
- **Tauri** with a Rust backend
- **React** with **Vite** for the UI
- **Tailwind CSS 3** for styling
- **Lucide React** for icons
- Persistent storage backed by a JSON file in the app data directory

## License

MIT

## Codec Licensing Disclaimer

⚠️ **Important**: This application uses FFmpeg, which may include codecs with various licensing requirements:

- **DNxHD/DNxHR**: Proprietary Avid codec. Commercial use may require licensing from Avid.
- **ProRes**: Proprietary Apple codec. FFmpeg's implementation is unofficial and may have compatibility issues. Commercial encoding may require Apple ProRes certification.
- **H.264/H.265**: May require GPL compliance or commercial licenses from x264/x265 developers, and separate patent licensing from MPEG-LA or HEVC Advance.
- **CineForm**: Open source, free for commercial use (GoPro open-sourced in 2017).
- **AV1**: BSD licensed, free for commercial use.

**You are responsible** for ensuring your FFmpeg installation and codec usage complies with applicable licenses. This application does not include FFmpeg binaries - you must install FFmpeg separately and are responsible for the licensing of your FFmpeg build.

### How FFmpeg Handles Licensing

FFmpeg itself is licensed under LGPL v2.1+, which allows proprietary linking. However:

1. **FFmpeg doesn't bundle GPL codecs by default** - GPL-licensed codecs like libx264 and libx265 must be explicitly enabled during compilation with `--enable-gpl`.
2. **Users compile FFmpeg themselves** - FFmpeg provides source code, and users are responsible for license compliance when they compile it.
3. **FFmpeg doesn't distribute binaries with GPL codecs** - Official FFmpeg builds typically don't include GPL codecs to avoid GPL obligations.
4. **LGPL allows proprietary linking** - As long as FFmpeg is dynamically linked and users can replace it, proprietary applications can use LGPL-licensed FFmpeg.

Since this application requires users to install FFmpeg separately, users are responsible for ensuring their FFmpeg installation complies with applicable licenses for the codecs they use.
