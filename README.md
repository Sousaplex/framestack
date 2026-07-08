# Seq2Vid - Image Sequence Renderer

An Electron application for converting image sequences to high-quality video formats using FFmpeg.

## Features

- **Image Sequence Import**: Import PNG, TIFF, EXR, JPEG, and DPX image sequences
- **High-End Formats**: Support for DNxHD, DNxHR, ProRes4444, ProRes422, H.264, H.265, CineForm, and AV1
- **Alpha Channel Support**: Automatic detection and support for alpha channels
- **Job History**: Keep track of recent render jobs with ability to reuse settings
- **Smart Naming**: Automatic output file naming suggestions based on input sequence
- **File System Navigation**: Easy directory browsing and folder creation
- **Real-time Progress**: Live progress tracking with frame count, FPS, and ETA

## Prerequisites

- **FFmpeg**: Must be installed and available in your system PATH
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt-get install ffmpeg` or `sudo yum install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

- **Node.js**: Version 18 or higher

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

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
seq2vid/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main entry point and IPC handlers
│   │   ├── ffmpeg.ts      # FFmpeg wrapper and format configs
│   │   └── store.ts       # Job history storage
│   ├── preload/           # Preload scripts
│   │   └── index.ts       # Expose safe APIs to renderer
│   ├── renderer/          # React UI
│   │   ├── App.tsx        # Main app component
│   │   ├── components/    # UI components
│   │   ├── hooks/         # React hooks
│   │   └── utils/         # Utility functions
│   └── shared/            # Shared types and constants
│       ├── types.ts       # TypeScript types
│       └── formats.ts     # Video format definitions
├── package.json
├── electron.vite.config.ts
└── tailwind.config.js
```

## Development

The app uses:
- **Electron** with **Vite** for fast development
- **React** for the UI
- **Tailwind CSS 3** for styling
- **Lucide React** for icons
- **Electron Store** for persistent job history

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
