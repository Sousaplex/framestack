import { contextBridge, ipcRenderer } from 'electron'
import { ImageSequenceInfo, VideoFormat, RenderJob, RenderProgress, DirectoryInfo } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  // File selection
  selectImageSequence: (): Promise<string[] | null> =>
    ipcRenderer.invoke('select-image-sequence'),
  
  selectSequenceFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('select-sequence-folder'),
  
  selectZipFile: (allowMultiple?: boolean): Promise<string | string[] | null> =>
    ipcRenderer.invoke('select-zip-file', allowMultiple),
  
  extractAndDetectZip: (zipPath: string | string[], existingTempDir?: string): Promise<string[]> =>
    ipcRenderer.invoke('extract-and-detect-zip', zipPath, existingTempDir),
  
  detectSequenceFromFolder: (folderPath: string): Promise<string[]> =>
    ipcRenderer.invoke('detect-sequence-from-folder', folderPath),
  
  processDroppedFiles: (filePaths: string[], existingTempDir?: string): Promise<string[]> =>
    ipcRenderer.invoke('process-dropped-files', filePaths, existingTempDir),
  
  selectOutputDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('select-output-directory'),
  
  selectOutputFile: (defaultPath: string): Promise<string | null> =>
    ipcRenderer.invoke('select-output-file', defaultPath),

  // Directory operations
  browseDirectory: (path: string): Promise<DirectoryInfo> =>
    ipcRenderer.invoke('browse-directory', path),
  
  createDirectory: (parentPath: string, name: string): Promise<string> =>
    ipcRenderer.invoke('create-directory', parentPath, name),

  // Sequence detection
  detectSequenceInfo: (filePaths: string[]): Promise<ImageSequenceInfo> =>
    ipcRenderer.invoke('detect-sequence-info', filePaths),

  // Rendering
  renderSequence: (
    jobId: string,
    sequenceInfo: ImageSequenceInfo,
    outputPath: string,
    format: VideoFormat
  ): Promise<{ success: boolean; jobId: string }> =>
    ipcRenderer.invoke('render-sequence', jobId, sequenceInfo, outputPath, format),
  
  cancelRender: (): Promise<boolean> =>
    ipcRenderer.invoke('cancel-render'),

  // Job history
  getJobHistory: (): Promise<RenderJob[]> =>
    ipcRenderer.invoke('get-job-history'),
  
  saveJob: (job: RenderJob): Promise<boolean> =>
    ipcRenderer.invoke('save-job', job),
  
  clearJobHistory: (): Promise<boolean> =>
    ipcRenderer.invoke('clear-job-history'),

  // System
  checkFFmpeg: (): Promise<{ available: boolean; error?: string; path?: string }> =>
    ipcRenderer.invoke('check-ffmpeg'),
  
  getFFmpegPath: (): Promise<string | null> =>
    ipcRenderer.invoke('get-ffmpeg-path'),
  
  setFFmpegPath: (path: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('set-ffmpeg-path', path),
  
  browseFFmpegPath: (): Promise<string | null> =>
    ipcRenderer.invoke('browse-ffmpeg-path'),

  // Progress events
  onRenderProgress: (callback: (jobId: string, progress: RenderProgress) => void) => {
    ipcRenderer.on('render-progress', (_, jobId: string, progress: RenderProgress) => {
      callback(jobId, progress)
    })
  },

  removeRenderProgressListener: () => {
    ipcRenderer.removeAllListeners('render-progress')
  },

  // Extraction progress
  onExtractionProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('extraction-progress', (_, progress: any) => {
      callback(progress)
    })
  },

  removeExtractionProgressListener: () => {
    ipcRenderer.removeAllListeners('extraction-progress')
  },

  // Preferences
  getDownloadsFolder: (): Promise<string> =>
    ipcRenderer.invoke('get-downloads-folder'),
  
  getPreferredOutputFolder: (): Promise<string> =>
    ipcRenderer.invoke('get-preferred-output-folder'),
  
  setPreferredOutputFolder: (folder: string): Promise<boolean> =>
    ipcRenderer.invoke('set-preferred-output-folder', folder),

  // App Info
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-app-version'),
  
  getAppIconPath: (): Promise<string | null> =>
    ipcRenderer.invoke('get-app-icon-path')
})

// Type declarations for TypeScript
declare global {
  interface Window {
    electronAPI: {
      selectImageSequence: () => Promise<string[] | null>
      selectSequenceFolder: () => Promise<string | null>
      selectZipFile: () => Promise<string | null>
      extractAndDetectZip: (zipPath: string) => Promise<string[]>
      detectSequenceFromFolder: (folderPath: string) => Promise<string[]>
      processDroppedFiles: (filePaths: string[]) => Promise<string[]>
      selectOutputDirectory: () => Promise<string | null>
      selectOutputFile: (defaultPath: string) => Promise<string | null>
      browseDirectory: (path: string) => Promise<DirectoryInfo>
      createDirectory: (parentPath: string, name: string) => Promise<string>
      detectSequenceInfo: (filePaths: string[]) => Promise<ImageSequenceInfo>
      renderSequence: (
        jobId: string,
        sequenceInfo: ImageSequenceInfo,
        outputPath: string,
        format: VideoFormat
      ) => Promise<{ success: boolean; jobId: string }>
      cancelRender: () => Promise<boolean>
      getJobHistory: () => Promise<RenderJob[]>
      saveJob: (job: RenderJob) => Promise<boolean>
      clearJobHistory: () => Promise<boolean>
      checkFFmpeg: () => Promise<{ available: boolean; error?: string; path?: string }>
      getFFmpegPath: () => Promise<string | null>
      setFFmpegPath: (path: string) => Promise<{ success: boolean; error?: string }>
      browseFFmpegPath: () => Promise<string | null>
      onRenderProgress: (callback: (jobId: string, progress: RenderProgress) => void) => void
      removeRenderProgressListener: () => void
      onExtractionProgress: (callback: (progress: any) => void) => void
      removeExtractionProgressListener: () => void
      getDownloadsFolder: () => Promise<string>
      getPreferredOutputFolder: () => Promise<string>
      setPreferredOutputFolder: (folder: string) => Promise<boolean>
      getAppVersion: () => Promise<string>
      getAppIconPath: () => Promise<string | null>
    }
  }
}
