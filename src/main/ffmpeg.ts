import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { ImageSequenceInfo, VideoFormat, RenderProgress } from '../shared/types'
import { VIDEO_FORMATS } from '../shared/formats'

// Export cache clearing function
export function clearFFmpegPathCache() {
  cachedFFmpegPath = null
}

// Function to get custom path from preferences (called from main process)
let getCustomFFmpegPath: (() => string | undefined) | null = null

export function setCustomFFmpegPathGetter(getter: () => string | undefined) {
  getCustomFFmpegPath = getter
}

export interface RenderResult {
  process: ChildProcess
  jobId: string
}

const VIDEO_FORMATS_MAP: Record<string, VideoFormat> = {
  dnxhd: {
    id: 'dnxhd',
    name: 'DNxHD',
    codec: 'dnxhd',
    extension: '.mov',
    supportsAlpha: false,
    description: 'DNxHD 220Mbps',
    bitrate: '220M'
  },
  dnxhr: {
    id: 'dnxhr',
    name: 'DNxHR HQX',
    codec: 'dnxhd',
    extension: '.mov',
    supportsAlpha: false,
    description: 'DNxHR HQX Profile',
    bitrate: '220M'
  },
  prores4444: {
    id: 'prores4444',
    name: 'ProRes 4444',
    codec: 'prores_ks',
    extension: '.mov',
    supportsAlpha: true,
    description: 'ProRes 4444 with Alpha',
    quality: '4444'
  },
  prores422: {
    id: 'prores422',
    name: 'ProRes 422',
    codec: 'prores_ks',
    extension: '.mov',
    supportsAlpha: false,
    description: 'ProRes 422 HQ',
    quality: '422'
  },
  h264: {
    id: 'h264',
    name: 'H.264',
    codec: 'libx264',
    extension: '.mp4',
    supportsAlpha: false,
    description: 'H.264 High Quality',
    quality: '18'
  },
  h265: {
    id: 'h265',
    name: 'H.265',
    codec: 'libx265',
    extension: '.mp4',
    supportsAlpha: false,
    description: 'H.265 High Quality',
    quality: '18'
  },
  cineform: {
    id: 'cineform',
    name: 'CineForm',
    codec: 'cfhd',
    extension: '.avi',
    supportsAlpha: false,
    description: 'CineForm High Quality',
    quality: '4'
  },
  av1: {
    id: 'av1',
    name: 'AV1',
    codec: 'libaom-av1',
    extension: '.mp4',
    supportsAlpha: false,
    description: 'AV1 High Quality',
    quality: '30'
  }
}

export function getVideoFormat(id: string): VideoFormat | undefined {
  return VIDEO_FORMATS_MAP[id] || VIDEO_FORMATS.find(f => f.id === id)
}

function buildFFmpegArgs(
  sequenceInfo: ImageSequenceInfo,
  outputPath: string,
  format: VideoFormat
): string[] {
  const inputPattern = join(sequenceInfo.directory, sequenceInfo.pattern)
  const args: string[] = [
    '-y', // Overwrite output file
    '-framerate', '24', // Default framerate, could be configurable
    '-i', inputPattern,
  ]

  // Video codec and format settings
  if (format.id === 'dnxhd') {
    args.push(
      '-c:v', 'dnxhd',
      '-b:v', '220M',
      '-pix_fmt', 'yuv422p'
    )
  } else if (format.id === 'dnxhr') {
    args.push(
      '-c:v', 'dnxhd',
      '-profile:v', 'dnxhr_hqx',
      '-pix_fmt', 'yuv422p'
    )
  } else if (format.id === 'prores4444') {
    args.push(
      '-c:v', 'prores_ks',
      '-profile:v', '4444',
      '-pix_fmt', sequenceInfo.hasAlpha ? 'yuva444p10le' : 'yuv444p10le'
    )
  } else if (format.id === 'prores422') {
    args.push(
      '-c:v', 'prores_ks',
      '-profile:v', '422',
      '-pix_fmt', 'yuv422p10le'
    )
  } else if (format.id === 'h264') {
    args.push(
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '18',
      '-pix_fmt', 'yuv420p'
    )
  } else if (format.id === 'h265') {
    args.push(
      '-c:v', 'libx265',
      '-preset', 'slow',
      '-crf', '18',
      '-pix_fmt', 'yuv420p'
    )
  } else if (format.id === 'cineform') {
    args.push(
      '-c:v', 'cfhd',
      '-quality', '4',
      '-pix_fmt', 'yuv422p'
    )
  } else if (format.id === 'av1') {
    args.push(
      '-c:v', 'libaom-av1',
      '-crf', '30',
      '-pix_fmt', 'yuv420p'
    )
  }

  // Note: Alpha channel handling is already done in the codec-specific settings above
  // The pix_fmt for ProRes4444 already includes alpha when hasAlpha is true

  args.push(outputPath)

  return args
}

// Cache for FFmpeg path to avoid repeated lookups
let cachedFFmpegPath: string | null = null

// Find FFmpeg executable path
// If customPath is provided, use it and validate it
export function findFFmpegPath(customPath?: string): string {
  // Check for custom path from preferences first
  const prefsCustomPath = getCustomFFmpegPath ? getCustomFFmpegPath() : undefined
  const pathToCheck = customPath || prefsCustomPath
  
  // If custom path provided, validate and use it
  if (pathToCheck) {
    try {
      const { execSync } = require('child_process')
      execSync(`"${pathToCheck}" -version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
      cachedFFmpegPath = pathToCheck
      return pathToCheck
    } catch (error) {
      // Custom path invalid, fall through to auto-detection
      console.warn(`Custom FFmpeg path invalid: ${pathToCheck}, falling back to auto-detection`)
    }
  }
  
  // Return cached path if available
  if (cachedFFmpegPath) {
    return cachedFFmpegPath
  }
  
  const { execSync } = require('child_process')
  
  // Try to find FFmpeg in common locations
  // Packaged apps don't inherit full PATH, so we need to check explicitly
  const possiblePaths = [
    'ffmpeg', // Try system PATH first
    '/opt/homebrew/bin/ffmpeg', // Homebrew on Apple Silicon
    '/usr/local/bin/ffmpeg', // Homebrew on Intel Mac / Linux
    '/usr/bin/ffmpeg', // System installation
    'C:\\ffmpeg\\bin\\ffmpeg.exe', // Windows common location
  ]
  
  // First, try to use 'which' or 'where' to find ffmpeg
  try {
    if (process.platform === 'win32') {
      const result = execSync('where ffmpeg', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
      if (result) {
        const path = result.split('\n')[0].trim()
        // Verify it works
        execSync(`"${path}" -version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
        cachedFFmpegPath = path
        return path
      }
    } else {
      const result = execSync('which ffmpeg', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
      if (result) {
        // Verify it works
        execSync(`"${result}" -version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
        cachedFFmpegPath = result
        return result
      }
    }
  } catch (error) {
    // which/where failed, try direct paths
  }
  
  // If which/where didn't work, try common paths
  for (const path of possiblePaths) {
    try {
      execSync(`"${path}" -version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
      cachedFFmpegPath = path
      return path
    } catch (error) {
      // Try next path
    }
  }
  
  // Fallback to 'ffmpeg' (will fail if not in PATH, but that's expected)
  return 'ffmpeg'
}

export function renderSequence(
  jobId: string,
  sequenceInfo: ImageSequenceInfo,
  outputPath: string,
  format: VideoFormat,
  onProgress: (progress: RenderProgress) => void
): Promise<RenderResult> {
  return new Promise((resolve, reject) => {
    const args = buildFFmpegArgs(sequenceInfo, outputPath, format)
    const ffmpegPath = findFFmpegPath()
    
    console.log(`[Render ${jobId}] Starting render...`)
    console.log(`[Render ${jobId}] Input: ${sequenceInfo.directory}/${sequenceInfo.pattern}`)
    console.log(`[Render ${jobId}] Output: ${outputPath}`)
    console.log(`[Render ${jobId}] Format: ${format.name} (${format.codec})`)
    console.log(`[Render ${jobId}] Frames: ${sequenceInfo.frameCount}`)
    console.log(`[Render ${jobId}] FFmpeg path: ${ffmpegPath}`)
    console.log(`[Render ${jobId}] FFmpeg command: ${ffmpegPath} ${args.join(' ')}`)
    
    const ffmpegProcess = spawn(ffmpegPath, args)
    const startTime = Date.now()
    
    console.log(`[Render ${jobId}] 🚀 FFmpeg process started (PID: ${ffmpegProcess.pid})`)
    
    // Return process immediately so it can be stored for cancellation
    // But resolve promise only when process completes
    resolve({ process: ffmpegProcess, jobId })

    let stderr = ''
    let lastProgress: RenderProgress = {
      currentFrame: 0,
      totalFrames: sequenceInfo.frameCount,
      percentage: 0,
      fps: 0
    }
    let lastLoggedFrame = 0

    ffmpegProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
      
      // Parse FFmpeg progress output
      const lines = stderr.split('\n')
      for (const line of lines) {
        // Match frame number: frame=  123 fps= 24 q=28.0 size=    1024kB time=00:00:05.12 bitrate=1638.4kbits/s speed=1.02x
        const frameMatch = line.match(/frame=\s*(\d+)/)
        const fpsMatch = line.match(/fps=\s*([\d.]+)/)
        const timeMatch = line.match(/time=(\d+):(\d+):(\d+\.\d+)/)
        const sizeMatch = line.match(/size=\s*(\d+)(\w+)/)
        const bitrateMatch = line.match(/bitrate=\s*([\d.]+)\s*(\w+)/)
        
        if (frameMatch) {
          const currentFrame = parseInt(frameMatch[1])
          const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 0
          const totalFrames = sequenceInfo.frameCount
          const percentage = Math.min((currentFrame / totalFrames) * 100, 100)
          
          let eta: number | undefined
          if (fps > 0 && currentFrame > 0) {
            const remainingFrames = totalFrames - currentFrame
            eta = remainingFrames / fps
          }

          lastProgress = {
            currentFrame,
            totalFrames,
            percentage,
            fps,
            eta
          }

          // Log progress every 10 frames or every 5%
          if (currentFrame - lastLoggedFrame >= 10 || Math.floor(percentage / 5) !== Math.floor((lastProgress.percentage || 0) / 5)) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
            console.log(
              `[Render ${jobId}] Progress: ${percentage.toFixed(1)}% | ` +
              `Frame ${currentFrame}/${totalFrames} | ` +
              `FPS: ${fps.toFixed(1)} | ` +
              `ETA: ${eta ? Math.floor(eta / 60) + 'm ' + Math.floor(eta % 60) + 's' : '--'} | ` +
              `Elapsed: ${elapsed}s`
            )
            lastLoggedFrame = currentFrame
          }

          onProgress(lastProgress)
        }
      }
    })

    // Track completion separately - the promise already resolved with the process
    // This is just for logging and error handling
    let completed = false
    
    ffmpegProcess.on('close', (code) => {
      if (completed) return // Avoid duplicate logging
      completed = true
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      if (code === 0 || code === null) {
        console.log(`[Render ${jobId}] ✅ Render completed successfully in ${elapsed}s`)
        console.log(`[Render ${jobId}] Output saved to: ${outputPath}`)
      } else {
        const errorMsg = `FFmpeg process exited with code ${code}: ${stderr.slice(-500)}`
        console.error(`[Render ${jobId}] ❌ Render failed after ${elapsed}s`)
        console.error(`[Render ${jobId}] Error: ${errorMsg}`)
      }
    })

    ffmpegProcess.on('error', (error) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.error(`[Render ${jobId}] ❌ Failed to start FFmpeg after ${elapsed}s`)
      console.error(`[Render ${jobId}] Error: ${error.message}`)
      reject(new Error(`Failed to start FFmpeg: ${error.message}`))
    })

    // Note: Promise resolves when process closes (in the 'close' event handler above)
    // This ensures we wait for FFmpeg to actually finish encoding
  })
}
