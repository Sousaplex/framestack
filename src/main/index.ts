import { app, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron'
import { join, dirname, basename, extname } from 'path'
import { existsSync, createWriteStream, readFileSync, readdirSync } from 'fs'
import { readdir, mkdir, stat } from 'fs/promises'
import { spawn, ChildProcess, execSync } from 'child_process'
import { renderSequence, findFFmpegPath, clearFFmpegPathCache, setCustomFFmpegPathGetter } from './ffmpeg'
import { JobStore } from './store'
import yauzl from 'yauzl'

let mainWindow: BrowserWindow | null = null
let currentRenderProcess: ChildProcess | null = null
const jobStore = new JobStore()

// Set up custom FFmpeg path getter for ffmpeg.ts
setCustomFFmpegPathGetter(() => {
  const prefs = jobStore.getPreferences()
  return prefs.ffmpegPath
})

function createWindow() {
  // Preload script path
  const preloadPath = join(__dirname, '../preload/index.js')
  
  // Icon path - try to find icon in resources folder
  // Prioritize platform-specific icons
  // Try multiple possible paths for dev vs production vs preview
  let iconPath: string | undefined
  const possibleResourceDirs = [
    join(process.cwd(), 'resources'),        // Dev/preview mode (from project root)
    join(__dirname, '../../resources'),      // Production build (relative to dist-electron/main)
    join(app.getAppPath(), 'resources'),    // Packaged app
    join(__dirname, '../../../resources'),   // Alternative production path
  ]
  
  let resourcesDir: string | undefined
  for (const dir of possibleResourceDirs) {
    if (existsSync(dir)) {
      resourcesDir = dir
      break
    }
  }
  
  if (!resourcesDir) {
    resourcesDir = join(process.cwd(), 'resources') // Fallback to project root
  }
  
  // Platform-specific icon priority
  if (process.platform === 'darwin') {
    // macOS: prefer .icns
    const icnsPath = join(resourcesDir, 'icon.icns')
    const pngPath = join(resourcesDir, 'icon.png')
    if (existsSync(icnsPath)) {
      iconPath = icnsPath
    } else if (existsSync(pngPath)) {
      iconPath = pngPath
    }
  } else if (process.platform === 'win32') {
    // Windows: prefer .ico, fallback to .png
    const icoPath = join(resourcesDir, 'icon.ico')
    const pngPath = join(resourcesDir, 'icon.png')
    if (existsSync(icoPath)) {
      iconPath = icoPath
    } else if (existsSync(pngPath)) {
      iconPath = pngPath
    }
  } else {
    // Linux: prefer .png
    const pngPath = join(resourcesDir, 'icon.png')
    if (existsSync(pngPath)) {
      iconPath = pngPath
    }
  }
  
  // Fallback to any available icon
  if (!iconPath) {
    const fallbackPaths = [
      join(resourcesDir, 'icon.png'),
      join(resourcesDir, 'icon.icns'),
      join(resourcesDir, 'icon.jpeg'),
      join(resourcesDir, 'icon.jpg')
    ]
    for (const path of fallbackPaths) {
      if (existsSync(path)) {
        iconPath = path
        break
      }
    }
  }

  // Convert icon path to native image if available
  let iconImage: Electron.NativeImage | undefined
  if (iconPath && existsSync(iconPath)) {
    try {
      iconImage = nativeImage.createFromPath(iconPath)
      if (iconImage.isEmpty()) {
        iconImage = undefined
      }
    } catch (error) {
      console.warn('Failed to load icon image:', error)
      iconImage = undefined
    }
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconImage || iconPath, // Set app icon (window icon) - use native image if available, fallback to path
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Enable file drop
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  // Handle window close - cancel any running renders
  mainWindow.on('closed', () => {
    if (currentRenderProcess) {
      currentRenderProcess.kill('SIGTERM')
      currentRenderProcess = null
    }
    mainWindow = null
  })

  if (process.env.NODE_ENV === 'development') {
    const port = process.env.VITE_DEV_SERVER_PORT || 5173
    mainWindow.loadURL(`http://localhost:${port}`)
    mainWindow.webContents.openDevTools()
  } else {
    // Try multiple possible renderer paths (preview vs production vs packaged)
    // When packaged, files are in app.asar, app.getAppPath() points to the app directory
    const possibleRendererPaths = [
      join(__dirname, '../../out/renderer/index.html'),     // Preview mode (from dist-electron/main)
      join(app.getAppPath(), 'out/renderer/index.html'),    // Packaged app (app.asar/out/renderer/index.html)
      join(__dirname, '../renderer/index.html'),            // Alternative production path
      join(process.cwd(), 'out/renderer/index.html'),       // Alternative preview path
    ]
    
    let rendererPath: string | null = null
    for (const path of possibleRendererPaths) {
      // existsSync works for files in ASAR, but path must be correct
      if (existsSync(path)) {
        rendererPath = path
        break
      }
    }
    
    if (rendererPath) {
      mainWindow.loadFile(rendererPath)
    } else {
      console.error('Could not find renderer index.html. Tried:', possibleRendererPaths)
      console.error('__dirname:', __dirname)
      console.error('app.getAppPath():', app.getAppPath())
      console.error('process.cwd():', process.cwd())
      // Try to list what's actually in app.getAppPath()
      try {
        const appPathContents = readdirSync(app.getAppPath())
        console.error('Contents of app.getAppPath():', appPathContents)
      } catch (error) {
        console.error('Could not read app.getAppPath():', error)
      }
      mainWindow.loadURL('data:text/html,<h1>Renderer not found</h1><p>Please rebuild the application.</p>')
    }
  }
}

// Set app version from package.json
try {
  const packageJsonPath = join(__dirname, '../../package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  app.setVersion(packageJson.version || '1.0.0')
} catch (error) {
  console.warn('Failed to read version from package.json:', error)
  app.setVersion('1.0.0')
}

app.whenReady().then(async () => {
  // Set app icon before creating window (macOS)
  // Note: In dev mode, the dock icon might not change until you rebuild/restart
  if (process.platform === 'darwin') {
    try {
      // Find resources directory
      const possibleResourceDirs = [
        join(process.cwd(), 'resources'),
        join(__dirname, '../../resources'),
        join(app.getAppPath(), 'resources'),
      ]
      
      let resourcesDir: string | null = null
      for (const dir of possibleResourceDirs) {
        if (existsSync(dir)) {
          resourcesDir = dir
          break
        }
      }
      
      if (resourcesDir) {
        const pngPath = join(resourcesDir, 'icon.png')
        // Use PNG for dock icon (ICNS can fail to load properly in Electron)
        if (existsSync(pngPath)) {
          try {
            const icon = nativeImage.createFromPath(pngPath)
            if (icon && !icon.isEmpty()) {
              app.dock.setIcon(icon)
              console.log(`[Icon] ✅ Set dock icon from: ${pngPath}`)
            } else {
              console.warn(`[Icon] PNG file exists but is empty: ${pngPath}`)
            }
          } catch (error: any) {
            console.warn(`[Icon] Failed to load PNG:`, error.message)
          }
        } else {
          console.warn(`[Icon] PNG not found: ${pngPath}`)
        }
      }
    } catch (error) {
      console.warn('Failed to set dock icon:', error)
    }
  }
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Cancel any running render process
  if (currentRenderProcess) {
    currentRenderProcess.kill('SIGTERM')
    currentRenderProcess = null
  }
  
  // Quit the app when all windows are closed
  app.quit()
})

// Handle window close
app.on('before-quit', () => {
  // Cancel any running render process
  if (currentRenderProcess) {
    currentRenderProcess.kill('SIGTERM')
    currentRenderProcess = null
  }
})

// Helper function to find image files in a directory
async function findImageFilesInDirectory(dirPath: string): Promise<string[]> {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.exr', '.dpx']
  const entries = await readdir(dirPath, { withFileTypes: true })
  const imageFiles: string[] = []

  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase()
      if (imageExtensions.includes(ext)) {
        imageFiles.push(join(dirPath, entry.name))
      }
    }
  }

  return imageFiles.sort()
}

// Helper function to extract zip file with progress tracking
async function extractZipFile(
  zipPath: string, 
  extractTo: string,
  onProgress?: (progress: { currentFile: number; totalFiles: number; percentage: number; currentFileName: string }) => void
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null
    
    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        reject(new Error('Zip extraction timed out after 60 seconds'))
      }, 60000)
    }

    resetTimeout()

    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        if (timeoutId) clearTimeout(timeoutId)
        reject(err)
        return
      }

      if (!zipfile) {
        if (timeoutId) clearTimeout(timeoutId)
        reject(new Error('Failed to open zip file'))
        return
      }

      const imageExtensions = ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.exr', '.dpx']
      const extractedFiles: string[] = []
      let pendingExtractions = 0
      let zipEnded = false
      let totalImageFilesFound = 0

      zipfile.readEntry()

      zipfile.on('entry', (entry) => {
        resetTimeout() // Reset timeout on each entry
        
        const fileName = entry.fileName

        // Skip directories
        if (fileName.endsWith('/')) {
          zipfile.readEntry()
          return
        }

        // Check if it's an image file
        const isImageFile = imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
        
        // Only extract image files
        if (!isImageFile) {
          zipfile.readEntry()
          return
        }

        totalImageFilesFound++
        pendingExtractions++
        
        zipfile.openReadStream(entry, (err, readStream) => {
          if (err || !readStream) {
            pendingExtractions--
            checkComplete()
            zipfile.readEntry()
            return
          }

          const outputPath = join(extractTo, basename(fileName))
          const writeStream = createWriteStream(outputPath)

          // Update progress when starting extraction
          if (onProgress) {
            onProgress({
              currentFile: extractedFiles.length + 1,
              totalFiles: totalImageFilesFound,
              percentage: totalImageFilesFound > 0 
                ? Math.min(((extractedFiles.length + 1) / totalImageFilesFound) * 100, 95) 
                : 0,
              currentFileName: basename(fileName)
            })
          }

          readStream.pipe(writeStream)

          writeStream.on('close', () => {
            extractedFiles.push(outputPath)
            pendingExtractions--
            
            // Update progress after extraction
            if (onProgress) {
              onProgress({
                currentFile: extractedFiles.length,
                totalFiles: totalImageFilesFound,
                percentage: totalImageFilesFound > 0 
                  ? Math.min((extractedFiles.length / totalImageFilesFound) * 100, 95) 
                  : 0,
                currentFileName: basename(fileName)
              })
            }
            
            // Continue reading next entry
            zipfile.readEntry()
            checkComplete()
          })

          writeStream.on('error', (err) => {
            pendingExtractions--
            // Continue reading next entry even on error
            zipfile.readEntry()
            checkComplete()
          })
        })
      })

      zipfile.on('end', () => {
        zipEnded = true
        checkComplete()
      })

      zipfile.on('error', (err) => {
        if (timeoutId) clearTimeout(timeoutId)
        reject(err)
      })

      function checkComplete() {
        // Resolve when zip processing is done and all extractions are complete
        if (zipEnded && pendingExtractions === 0) {
          if (timeoutId) clearTimeout(timeoutId)
          
          if (extractedFiles.length === 0) {
            reject(new Error('No image files found in zip archive'))
          } else {
            // Final progress update
            if (onProgress) {
              onProgress({
                currentFile: extractedFiles.length,
                totalFiles: extractedFiles.length,
                percentage: 100,
                currentFileName: ''
              })
            }
            resolve(extractedFiles)
          }
        }
      }
    })
  })
}

// IPC Handlers
ipcMain.handle('select-image-sequence', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'tiff', 'tif', 'exr', 'dpx'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (result.canceled) {
    return null
  }

  return result.filePaths
})

ipcMain.handle('select-sequence-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })

  if (result.canceled) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('select-zip-file', async (_, allowMultiple: boolean = false) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: allowMultiple ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: [
      { name: 'Zip Files', extensions: ['zip'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (result.canceled) {
    return null
  }

  return allowMultiple ? result.filePaths : result.filePaths[0]
})

ipcMain.handle('extract-and-detect-zip', async (_, zipPath: string | string[], existingTempDir?: string) => {
  try {
    // Use existing temp directory if provided (for merging multiple zips), otherwise create new one
    const tempDir = existingTempDir || join(app.getPath('temp'), 'framestack-extract', Date.now().toString())
    await mkdir(tempDir, { recursive: true })

    const zipPaths = Array.isArray(zipPath) ? zipPath : [zipPath]
    let allImageFiles: string[] = []

    // Helper to safely send progress updates
    const safeSend = (channel: string, ...args: any[]) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          mainWindow.webContents.send(channel, ...args)
        } catch (error) {
          console.warn('Failed to send progress update:', error)
        }
      }
    }

    // Extract all zip files to the same directory
    for (let i = 0; i < zipPaths.length; i++) {
      const currentZipPath = zipPaths[i]
      console.log(`[Zip Extract] Starting extraction ${i + 1}/${zipPaths.length}: ${basename(currentZipPath)}`)

      const imageFiles = await extractZipFile(
        currentZipPath, 
        tempDir,
        (progress) => {
          // Adjust progress to account for multiple zips
          const adjustedProgress = {
            ...progress,
            currentFile: allImageFiles.length + progress.currentFile,
            totalFiles: zipPaths.length > 1 ? undefined : progress.totalFiles, // Don't show total for multiple zips
            currentFileName: `${basename(currentZipPath)}: ${progress.currentFileName}`
          }
          safeSend('extraction-progress', adjustedProgress)
        }
      )

      allImageFiles = allImageFiles.concat(imageFiles)
      console.log(`[Zip Extract] Extracted ${imageFiles.length} image files from ${basename(currentZipPath)}`)
    }

    if (allImageFiles.length === 0) {
      throw new Error('No image files found in zip archive(s)')
    }

    console.log(`[Zip Extract] Total extracted ${allImageFiles.length} image files from ${zipPaths.length} zip file(s)`)
    return allImageFiles
  } catch (error: any) {
    console.error(`[Zip Extract] Error: ${error.message}`)
    throw new Error(`Failed to extract zip file(s): ${error.message}`)
  }
})

ipcMain.handle('detect-sequence-from-folder', async (_, folderPath: string) => {
  try {
    const imageFiles = await findImageFilesInDirectory(folderPath)
    
    if (imageFiles.length === 0) {
      throw new Error('No image files found in folder')
    }

    console.log(`[Folder] Found ${imageFiles.length} image files in ${basename(folderPath)}`)
    return imageFiles
  } catch (error: any) {
    throw new Error(`Failed to detect sequence in folder: ${error.message}`)
  }
})

ipcMain.handle('process-dropped-files', async (_, filePaths: string[], existingTempDir?: string) => {
  try {
    if (!filePaths || filePaths.length === 0) {
      throw new Error('No files provided')
    }

    console.log(`[Drop] Processing ${filePaths.length} dropped item(s)`)
    const firstPath = filePaths[0]
    console.log(`[Drop] First path: ${firstPath}`)

    // Check if all dropped files are zip files
    const allZips = filePaths.every(path => path.toLowerCase().endsWith('.zip'))
    const zipFiles = filePaths.filter(path => path.toLowerCase().endsWith('.zip'))

    if (allZips && zipFiles.length > 0) {
      console.log(`[Drop] Detected ${zipFiles.length} ZIP file(s)`)
      
      // Use existing temp directory if provided (for merging), otherwise create new one
      const tempDir = existingTempDir || join(app.getPath('temp'), 'framestack-extract', Date.now().toString())
      await mkdir(tempDir, { recursive: true })
      
      // Helper to safely send progress updates
      const safeSend = (channel: string, ...args: any[]) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          try {
            mainWindow.webContents.send(channel, ...args)
          } catch (error) {
            console.warn('Failed to send progress update:', error)
          }
        }
      }
      
      // Extract all zip files to the same directory
      let allImageFiles: string[] = []
      for (let i = 0; i < zipFiles.length; i++) {
        const zipPath = zipFiles[i]
        console.log(`[Drop] Extracting ${i + 1}/${zipFiles.length}: ${basename(zipPath)}`)
        
        const imageFiles = await extractZipFile(
          zipPath, 
          tempDir,
          (progress) => {
            // Adjust progress to account for multiple zips
            const adjustedProgress = {
              ...progress,
              currentFile: allImageFiles.length + progress.currentFile,
              totalFiles: zipFiles.length > 1 ? undefined : progress.totalFiles,
              currentFileName: `${basename(zipPath)}: ${progress.currentFileName}`
            }
            safeSend('extraction-progress', adjustedProgress)
          }
        )
        
        allImageFiles = allImageFiles.concat(imageFiles)
        console.log(`[Drop] Extracted ${imageFiles.length} image files from ${basename(zipPath)}`)
      }
      
      console.log(`[Drop] Total extracted ${allImageFiles.length} image files from ${zipFiles.length} ZIP file(s)`)
      return allImageFiles
    } else {
      // Check if it's a directory
      try {
        const stats = await stat(firstPath)
        if (stats.isDirectory()) {
          console.log(`[Drop] Detected folder: ${firstPath}`)
          // It's a folder
          const imageFiles = await findImageFilesInDirectory(firstPath)
          console.log(`[Drop] Found ${imageFiles.length} image files in folder`)
          return imageFiles
        } else {
          console.log(`[Drop] Detected regular files: ${filePaths.length} files`)
          // It's regular files - filter to only image files
          const imageExtensions = ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.exr', '.dpx']
          const imageFiles = filePaths.filter(path => {
            const ext = extname(path).toLowerCase()
            return imageExtensions.includes(ext)
          })
          console.log(`[Drop] Filtered to ${imageFiles.length} image files`)
          return imageFiles
        }
      } catch (error: any) {
        console.log(`[Drop] Error checking path, assuming regular files: ${error.message}`)
        // Assume they're regular files - filter to only image files
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.exr', '.dpx']
        const imageFiles = filePaths.filter(path => {
          const ext = extname(path).toLowerCase()
          return imageExtensions.includes(ext)
        })
        return imageFiles
      }
    }
  } catch (error: any) {
    console.error(`[Drop] Error processing dropped files:`, error)
    throw new Error(`Failed to process dropped files: ${error.message}`)
  }
})

ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })

  if (result.canceled) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('select-output-file', async (_, defaultPath: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath,
    filters: [
      { name: 'Video Files', extensions: ['mov', 'mp4', 'mkv', 'avi'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (result.canceled) {
    return null
  }

  return result.filePath
})

ipcMain.handle('browse-directory', async (_, path: string) => {
  try {
    const entries = await readdir(path, { withFileTypes: true })
    const files: string[] = []
    const directories: string[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        directories.push(entry.name)
      } else {
        files.push(entry.name)
      }
    }

    return {
      path,
      files: files.sort(),
      directories: directories.sort()
    }
  } catch (error) {
    throw new Error(`Failed to browse directory: ${error}`)
  }
})

ipcMain.handle('create-directory', async (_, parentPath: string, name: string) => {
  try {
    const newPath = join(parentPath, name)
    await mkdir(newPath, { recursive: true })
    return newPath
  } catch (error) {
    throw new Error(`Failed to create directory: ${error}`)
  }
})

ipcMain.handle('detect-sequence-info', async (_, filePaths: string[]) => {
  if (!filePaths || filePaths.length === 0) {
    throw new Error('No files provided')
  }

  // Sort files naturally by extracting frame numbers
  const sortedFiles = filePaths.sort((a, b) => {
    const aBase = basename(a)
    const bBase = basename(b)
    
    // Extract all numbers from filename
    const aNumbers = aBase.match(/\d+/g)
    const bNumbers = bBase.match(/\d+/g)
    
    if (aNumbers && bNumbers && aNumbers.length > 0) {
      // Compare first number found (usually frame number)
      const aNum = parseInt(aNumbers[0])
      const bNum = parseInt(bNumbers[0])
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum
      }
    }
    
    return aBase.localeCompare(bBase)
  })

  const firstFile = sortedFiles[0]
  const lastFile = sortedFiles[sortedFiles.length - 1]
  const dir = dirname(firstFile)
  const ext = extname(firstFile).toLowerCase()
  const firstBase = basename(firstFile)
  const lastBase = basename(lastFile)

  // Detect pattern by finding frame numbers
  let pattern = firstBase
  let firstFrame = 0
  let lastFrame = 0

  // Try to find frame numbers in filenames
  const firstMatch = firstBase.match(/(\d+)/)
  const lastMatch = lastBase.match(/(\d+)/)
  
  if (firstMatch && lastMatch) {
    firstFrame = parseInt(firstMatch[1])
    lastFrame = parseInt(lastMatch[1])
    
    // Determine padding (how many digits)
    const firstNumStr = firstMatch[1]
    const padding = firstNumStr.length
    
    // Replace the number with FFmpeg pattern
    const patternStr = '%0' + padding + 'd'
    pattern = firstBase.replace(/\d+/, patternStr)
  } else {
    // No frame numbers found, use first filename as pattern
    pattern = firstBase
  }

  // Check for alpha channel (PNG, EXR, TIFF)
  const hasAlpha = ['.png', '.exr', '.tiff', '.tif'].includes(ext)

  // Try to get image dimensions using ffprobe
  let width: number | undefined
  let height: number | undefined

  try {
    const ffprobeOutput = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${firstFile}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    )
    const probeData = JSON.parse(ffprobeOutput)
    if (probeData.streams && probeData.streams[0]) {
      width = probeData.streams[0].width
      height = probeData.streams[0].height
    }
  } catch (error: any) {
    // Fallback: try to read image dimensions using image-size or skip
    console.warn('Could not detect image dimensions:', error.message)
  }

  return {
    directory: dir,
    pattern: pattern,
    firstFrame,
    lastFrame,
    frameCount: sortedFiles.length,
    extension: ext,
    width,
    height,
    hasAlpha,
    files: sortedFiles
  }
})

ipcMain.handle('render-sequence', async (_, jobId: string, sequenceInfo: any, outputPath: string, format: any) => {
  if (currentRenderProcess) {
    console.warn(`[Render ${jobId}] ⚠️  A render is already in progress`)
    throw new Error('A render is already in progress')
  }

  // Validate inputs
  if (!sequenceInfo || !outputPath || !format) {
    console.error(`[Render ${jobId}] ❌ Missing required parameters`)
    throw new Error('Missing required parameters for rendering')
  }

  console.log(`[Render ${jobId}] 📋 Render request received`)

  // Helper function to safely send messages to renderer
  const safeSend = (channel: string, ...args: any[]) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send(channel, ...args)
      } catch (error) {
        console.warn(`[Render ${jobId}] Failed to send message to renderer:`, error)
      }
    }
  }

  try {
    // Start the render - this returns immediately with the process
    const job = await renderSequence(
      jobId,
      sequenceInfo,
      outputPath,
      format,
      (progress) => {
        safeSend('render-progress', jobId, progress)
      }
    )

    // Store process reference for cancellation
    currentRenderProcess = job.process
    
    // Wait for process to complete
    await new Promise<void>((resolve, reject) => {
      job.process.on('close', (code) => {
        currentRenderProcess = null
        if (code === 0 || code === null) {
          console.log(`[Render ${jobId}] ✅ Process completed successfully`)
          // Send final completion message
          safeSend('render-progress', jobId, {
            currentFrame: sequenceInfo.frameCount,
            totalFrames: sequenceInfo.frameCount,
            percentage: 100,
            fps: 0
          })
          resolve()
        } else {
          // FFmpeg exit codes: 0=success, 1=error, 254=file not found/invalid pattern
          let errorMsg = `Process exited with code ${code}`
          if (code === 254) {
            errorMsg = `FFmpeg could not find input files. This may happen if:\n- Files were moved or deleted\n- Sequence pattern doesn't match all files\n- Multiple zip files weren't properly merged\n\nTry re-selecting all zip files at once, or ensure all files are in the same directory.`
          }
          console.error(`[Render ${jobId}] ⚠️  Process closed with code ${code}`)
          console.error(`[Render ${jobId}] Sequence directory: ${sequenceInfo.directory}`)
          console.error(`[Render ${jobId}] Pattern: ${sequenceInfo.pattern}`)
          safeSend('render-progress', jobId, {
            error: errorMsg
          })
          reject(new Error(errorMsg))
        }
      })

      job.process.on('error', (error) => {
        currentRenderProcess = null
        console.error(`[Render ${jobId}] ❌ Process error:`, error.message)
        safeSend('render-progress', jobId, {
          error: error.message
        })
        reject(error)
      })
    })

    return { success: true, jobId }
  } catch (error: any) {
    currentRenderProcess = null
    console.error(`[Render ${jobId}] ❌ Render failed:`, error.message)
    throw error
  }
})

ipcMain.handle('cancel-render', async () => {
  if (currentRenderProcess) {
    currentRenderProcess.kill('SIGTERM')
    currentRenderProcess = null
    return true
  }
  return false
})

ipcMain.handle('get-job-history', async () => {
  return jobStore.getAll()
})

ipcMain.handle('save-job', async (_, job: any) => {
  jobStore.save(job)
  return true
})

ipcMain.handle('clear-job-history', async () => {
  jobStore.clear()
  return true
})

ipcMain.handle('get-downloads-folder', async () => {
  return app.getPath('downloads')
})

ipcMain.handle('get-preferred-output-folder', async () => {
  const prefs = jobStore.getPreferences()
  return prefs.defaultOutputFolder || app.getPath('downloads')
})

ipcMain.handle('set-preferred-output-folder', async (_, folder: string) => {
  jobStore.setDefaultOutputFolder(folder)
  return true
})

ipcMain.handle('get-app-version', async () => {
  return app.getVersion()
})

ipcMain.handle('get-app-icon-path', async () => {
  // Try to find icon in resources folder and convert to data URL
  // Try multiple possible paths for dev vs production vs preview
  const possibleResourceDirs = [
    join(process.cwd(), 'resources'),        // Dev/preview mode
    join(__dirname, '../../resources'),      // Production build
    join(app.getAppPath(), 'resources'),    // Packaged app
  ]
  
  const possibleIconPaths: string[] = []
  for (const resourcesDir of possibleResourceDirs) {
    if (existsSync(resourcesDir)) {
      possibleIconPaths.push(
        join(resourcesDir, 'icon.png'),
        join(resourcesDir, 'icon.jpeg'),
        join(resourcesDir, 'icon.jpg')
      )
    }
  }
  
  // Prefer PNG/JPEG for renderer (ICNS doesn't work well in img tags)
  for (const path of possibleIconPaths) {
    if (existsSync(path)) {
      try {
        // Load as native image and convert to data URL
        const icon = nativeImage.createFromPath(path)
        if (!icon.isEmpty()) {
          // Convert to PNG data URL for use in img tag
          const pngDataUrl = icon.toDataURL()
          return pngDataUrl
        }
      } catch (error) {
        console.warn('Failed to load icon for renderer:', error)
      }
    }
  }
  
  return null
})

ipcMain.handle('check-ffmpeg', async () => {
  try {
    const { execSync } = require('child_process')
    // Check preferences first, then auto-detect
    const prefs = jobStore.getPreferences()
    const ffmpegPath = findFFmpegPath(prefs.ffmpegPath)
    
    // Verify FFmpeg works
    execSync(`"${ffmpegPath}" -version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
    return { available: true, path: ffmpegPath }
  } catch (error: any) {
    return { available: false, error: 'FFmpeg not found. Please install FFmpeg or specify a custom path.' }
  }
})

ipcMain.handle('get-ffmpeg-path', async () => {
  const prefs = jobStore.getPreferences()
  return prefs.ffmpegPath || null
})

ipcMain.handle('set-ffmpeg-path', async (_, path: string) => {
  try {
    // Validate the path
    const { execSync } = require('child_process')
    execSync(`"${path}" -version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
    
    // Save to preferences
    jobStore.setFFmpegPath(path)
    
    // Clear cache so it uses the new path
    clearFFmpegPathCache()
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: `Invalid FFmpeg path: ${error.message}` }
  }
})

ipcMain.handle('browse-ffmpeg-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select FFmpeg Executable',
    properties: ['openFile'],
    filters: [
      { name: 'Executable', extensions: process.platform === 'win32' ? ['exe'] : [''] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  
  return null
})
