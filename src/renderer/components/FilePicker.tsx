import { useState, useRef, useCallback, useEffect } from 'react'
import { ImageSequenceInfo, ExtractionProgress } from '@shared/types'
import { FolderOpen, Image as ImageIcon, CheckCircle2, Loader2, Folder, Archive, Upload } from 'lucide-react'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

interface FilePickerProps {
  onSequenceSelected: (info: ImageSequenceInfo | null) => void
  sequenceInfo: ImageSequenceInfo | null
}

export default function FilePicker({ onSequenceSelected, sequenceInfo }: FilePickerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importMethod, setImportMethod] = useState<'files' | 'folder' | 'zip'>('files')
  const [isDragging, setIsDragging] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null)
  const dropzoneRef = useRef<HTMLDivElement>(null)

  const processFiles = useCallback(async (filePaths: string[]) => {
    if (filePaths.length === 0) return

    try {
      setLoading(true)
      setError(null)

      // Check if it's a zip file
      const firstPath = filePaths[0]
      const isZip = firstPath.toLowerCase().endsWith('.zip')

      if (isZip && filePaths.length === 1) {
        // Handle zip file
        const imageFiles = await window.electronAPI.extractAndDetectZip(firstPath)
        if (imageFiles.length === 0) {
          throw new Error('No image files found in zip archive')
        }
        const info = await window.electronAPI.detectSequenceInfo(imageFiles)
        onSequenceSelected(info)
      } else {
        // Handle regular files or folder
        const info = await window.electronAPI.detectSequenceInfo(filePaths)
        onSequenceSelected(info)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load image sequence')
      onSequenceSelected(null)
    } finally {
      setLoading(false)
    }
  }, [onSequenceSelected])

  const loadingRef = useRef(loading)
  const processFilesRef = useRef(processFiles)

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    processFilesRef.current = processFiles
  }, [processFiles])

  useEffect(() => {
    // Set up extraction progress listener
    if (window.electronAPI && window.electronAPI.onExtractionProgress) {
      window.electronAPI.onExtractionProgress((progress) => {
        setExtractionProgress(progress)
      })
    }

    // Set up Tauri drag-drop listener
    const webviewWindow = getCurrentWebviewWindow()
    let unlisten: (() => void) | null = null

    webviewWindow.onDragDropEvent((event) => {
      const payload = event.payload as {
        type: 'drop' | 'over' | 'leave'
        paths?: string[]
        position?: { x: number; y: number }
      }

      switch (payload.type) {
        case 'over':
          setIsDragging(true)
          break
        case 'leave':
          setIsDragging(false)
          break
        case 'drop':
          setIsDragging(false)
          if (payload.paths && payload.paths.length > 0 && !loadingRef.current) {
            processFilesRef.current(payload.paths)
          }
          break
      }
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      if (window.electronAPI && window.electronAPI.removeExtractionProgressListener) {
        window.electronAPI.removeExtractionProgressListener()
      }
      if (unlisten) {
        unlisten()
      }
    }
  }, [])

  const handleSelectFiles = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const filePaths = await window.electronAPI.selectImageSequence()
      if (!filePaths || filePaths.length === 0) {
        return
      }

      await processFiles(filePaths)
    } catch (err: any) {
      setError(err.message || 'Failed to load image sequence')
      onSequenceSelected(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectFolder = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const folderPath = await window.electronAPI.selectSequenceFolder()
      if (!folderPath) {
        return
      }

      const imageFiles = await window.electronAPI.detectSequenceFromFolder(folderPath)
      if (imageFiles.length === 0) {
        throw new Error('No image files found in folder')
      }

      const info = await window.electronAPI.detectSequenceInfo(imageFiles)
      onSequenceSelected(info)
    } catch (err: any) {
      setError(err.message || 'Failed to load sequence from folder')
      onSequenceSelected(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectZip = async () => {
    try {
      setLoading(true)
      setError(null)
      setExtractionProgress(null)
      
      // Allow multiple zip selection if no sequence exists, or if user wants to add more
      const allowMultiple = !sequenceInfo
      const zipPathOrPaths = await window.electronAPI.selectZipFile(allowMultiple)
      
      if (!zipPathOrPaths) {
        setLoading(false)
        return
      }

      // Set up progress listener
      if (window.electronAPI.onExtractionProgress) {
        window.electronAPI.onExtractionProgress((progress) => {
          setExtractionProgress(progress)
        })
      }

      // If we have an existing sequence, extract to the same directory
      const existingTempDir = sequenceInfo?.directory
      const zipPaths = Array.isArray(zipPathOrPaths) ? zipPathOrPaths : [zipPathOrPaths]
      
      // If adding to existing sequence, use existing directory; otherwise extract all zips together
      const imageFiles = await window.electronAPI.extractAndDetectZip(
        zipPaths.length > 1 ? zipPaths : zipPaths[0],
        existingTempDir
      )
      
      // Clear progress
      setExtractionProgress(null)
      if (window.electronAPI.removeExtractionProgressListener) {
        window.electronAPI.removeExtractionProgressListener()
      }
      
      if (imageFiles.length === 0) {
        throw new Error('No image files found in zip archive(s)')
      }

      // If we had an existing sequence, merge the files; otherwise detect new sequence
      if (sequenceInfo && existingTempDir) {
        // Merge: combine existing files with new files
        const allFiles = [...(sequenceInfo.files || []), ...imageFiles]
        const info = await window.electronAPI.detectSequenceInfo(allFiles)
        onSequenceSelected(info)
      } else {
        // New sequence: detect from extracted files
        const info = await window.electronAPI.detectSequenceInfo(imageFiles)
        onSequenceSelected(info)
      }
    } catch (err: any) {
      setExtractionProgress(null)
      if (window.electronAPI.removeExtractionProgressListener) {
        window.electronAPI.removeExtractionProgressListener()
      }
      setError(err.message || 'Failed to extract and load zip file(s)')
      onSequenceSelected(null)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = () => {
    switch (importMethod) {
      case 'files':
        handleSelectFiles()
        break
      case 'folder':
        handleSelectFolder()
        break
      case 'zip':
        handleSelectZip()
        break
    }
  }

  return (
    <div
      ref={dropzoneRef}
      className={`glass rounded-2xl p-6 h-full flex flex-col transition-all ${
        isDragging ? 'border-2 border-blue-400 bg-blue-500/10' : ''
      }`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-dark-text mb-1">Image Sequence</h2>
          
          {!sequenceInfo ? (
            <div className="space-y-4">
              <p className="text-sm text-dark-text2">
                Drag and drop files/folders here, or choose an import method below. Supported formats: PNG, TIFF, EXR, JPEG, DPX
              </p>
              
              {/* Dropzone Area */}
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging 
                  ? 'border-blue-400 bg-blue-500/20' 
                  : 'border-dark-border glass-light hover:border-blue-400/50'
              }`}>
                <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-blue-400' : 'text-dark-text2'}`} />
                <p className="text-sm text-dark-text2 mb-1">
                  {isDragging ? 'Drop files here' : 'Drag and drop files, folder, or zip file here'}
                </p>
                <p className="text-xs text-dark-text2/70">or use the buttons below</p>
              </div>
              
              {/* Import Method Selection */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setImportMethod('files')}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    importMethod === 'files'
                      ? 'border-blue-400 bg-blue-500/20'
                      : 'border-dark-border glass-light hover:border-blue-400/50'
                  }`}
                >
                  <FolderOpen className="w-5 h-5 mx-auto mb-2 text-dark-text" />
                  <div className="text-xs font-medium text-dark-text">Select Files</div>
                </button>
                
                <button
                  onClick={() => setImportMethod('folder')}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    importMethod === 'folder'
                      ? 'border-blue-400 bg-blue-500/20'
                      : 'border-dark-border glass-light hover:border-blue-400/50'
                  }`}
                >
                  <Folder className="w-5 h-5 mx-auto mb-2 text-dark-text" />
                  <div className="text-xs font-medium text-dark-text">Select Folder</div>
                </button>
                
                <button
                  onClick={() => setImportMethod('zip')}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    importMethod === 'zip'
                      ? 'border-blue-400 bg-blue-500/20'
                      : 'border-dark-border glass-light hover:border-blue-400/50'
                  }`}
                >
                  <Archive className="w-5 h-5 mx-auto mb-2 text-dark-text" />
                  <div className="text-xs font-medium text-dark-text">Zip File</div>
                </button>
              </div>
              
              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {extractionProgress 
                        ? `Extracting: ${extractionProgress.currentFile}/${extractionProgress.totalFiles} files...`
                        : 'Loading...'}
                    </span>
                  </>
                ) : (
                  <>
                    {importMethod === 'files' && <FolderOpen className="w-4 h-4" />}
                    {importMethod === 'folder' && <Folder className="w-4 h-4" />}
                    {importMethod === 'zip' && <Archive className="w-4 h-4" />}
                    <span>
                      {importMethod === 'files' && 'Select Images'}
                      {importMethod === 'folder' && 'Select Folder'}
                      {importMethod === 'zip' && 'Select Zip File'}
                    </span>
                  </>
                )}
              </button>

              {/* Extraction Progress Bar */}
              {extractionProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-dark-text2">
                    <span>{extractionProgress.currentFileName}</span>
                    <span>{Math.round(extractionProgress.percentage)}%</span>
                  </div>
                  <div className="w-full bg-dark-surface2 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${extractionProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-dark-text2 text-center">
                    Extracting {extractionProgress.currentFile} of {extractionProgress.totalFiles} files
                  </p>
                </div>
              )}
              
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Sequence loaded</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-dark-text2">Directory:</span>
                  <p className="text-dark-text font-mono text-xs truncate" title={sequenceInfo.directory}>
                    {sequenceInfo.directory}
                  </p>
                </div>
                <div>
                  <span className="text-dark-text2">Pattern:</span>
                  <p className="text-dark-text font-mono text-xs">{sequenceInfo.pattern}</p>
                </div>
                <div>
                  <span className="text-dark-text2">Frames:</span>
                  <p className="text-dark-text font-medium">
                    {sequenceInfo.frameCount} ({sequenceInfo.firstFrame} - {sequenceInfo.lastFrame})
                  </p>
                </div>
                <div>
                  <span className="text-dark-text2">Resolution:</span>
                  <p className="text-dark-text">
                    {sequenceInfo.width && sequenceInfo.height
                      ? `${sequenceInfo.width} × ${sequenceInfo.height}`
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-dark-text2">Format:</span>
                  <p className="text-dark-text uppercase">{sequenceInfo.extension.replace('.', '')}</p>
                </div>
                <div>
                  <span className="text-dark-text2">Alpha Channel:</span>
                  <p className="text-dark-text">
                    {sequenceInfo.hasAlpha ? (
                      <span className="text-green-400 font-medium">Yes</span>
                    ) : (
                      <span className="text-dark-text2">No</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleSelectFiles}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Change sequence
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
