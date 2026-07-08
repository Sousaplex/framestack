import { invoke } from '@tauri-apps/api/core'
import { listen, Event, UnlistenFn } from '@tauri-apps/api/event'
import {
  ImageSequenceInfo,
  VideoFormat,
  RenderJob,
  RenderProgress,
  DirectoryInfo,
  ExtractionProgress
} from '@shared/types'

export interface FFmpegCheckResult {
  available: boolean
  error?: string
  path?: string
}

export interface SetFFmpegPathResult {
  success: boolean
  error?: string
}

export interface RenderResult {
  success: boolean
  jobId: string
}

// File / folder selection
export const selectImageSequence = (): Promise<string[] | null> =>
  invoke('select_image_sequence')

export const selectSequenceFolder = (): Promise<string | null> =>
  invoke('select_sequence_folder')

export const selectZipFile = (allowMultiple?: boolean): Promise<string | string[] | null> =>
  invoke('select_zip_file', { allowMultiple })

export const extractAndDetectZip = (
  zipPath: string | string[],
  existingTempDir?: string
): Promise<string[]> =>
  invoke('extract_and_detect_zip', { zipPath, existingTempDir })

export const detectSequenceFromFolder = (folderPath: string): Promise<string[]> =>
  invoke('detect_sequence_from_folder', { folderPath })

export const processDroppedFiles = (
  filePaths: string[],
  existingTempDir?: string
): Promise<string[]> =>
  invoke('process_dropped_files', { filePaths, existingTempDir })

export const selectOutputDirectory = (): Promise<string | null> =>
  invoke('select_output_directory')

export const selectOutputFile = (defaultPath: string): Promise<string | null> =>
  invoke('select_output_file', { defaultPath })

// Directory operations
export const browseDirectory = (path: string): Promise<DirectoryInfo> =>
  invoke('browse_directory', { path })

export const createDirectory = (parentPath: string, name: string): Promise<string> =>
  invoke('create_directory', { parentPath, name })

// Sequence detection
export const detectSequenceInfo = (filePaths: string[]): Promise<ImageSequenceInfo> =>
  invoke('detect_sequence_info_command', { filePaths })

// Rendering
export const renderSequence = (
  jobId: string,
  sequenceInfo: ImageSequenceInfo,
  outputPath: string,
  format: VideoFormat
): Promise<RenderResult> =>
  invoke('render_sequence_command', { jobId, sequenceInfo, outputPath, format })

export const cancelRender = (): Promise<boolean> =>
  invoke('cancel_render_command')

// Job history
export const getJobHistory = (): Promise<RenderJob[]> =>
  invoke('get_job_history')

export const saveJob = (job: RenderJob): Promise<boolean> =>
  invoke('save_job', { job })

export const clearJobHistory = (): Promise<boolean> =>
  invoke('clear_job_history')

// FFmpeg configuration
export const checkFFmpeg = (): Promise<FFmpegCheckResult> =>
  invoke('check_ffmpeg')

export const getFFmpegPath = (): Promise<string | null> =>
  invoke('get_ffmpeg_path')

export const setFFmpegPath = (path: string): Promise<SetFFmpegPathResult> =>
  invoke('set_ffmpeg_path', { path })

export const browseFFmpegPath = (): Promise<string | null> =>
  invoke('browse_ffmpeg_path')

// Event listeners
let renderProgressUnlisten: UnlistenFn | null = null
let extractionProgressUnlisten: UnlistenFn | null = null

export const onRenderProgress = (
  callback: (jobId: string, progress: RenderProgress) => void
): void => {
  // Remove existing listener to avoid duplicates
  if (renderProgressUnlisten) {
    renderProgressUnlisten()
    renderProgressUnlisten = null
  }

  listen('render-progress', (event: Event<[string, RenderProgress]>) => {
    const [jobId, progress] = event.payload
    callback(jobId, progress)
  }).then((unlisten) => {
    renderProgressUnlisten = unlisten
  })
}

export const removeRenderProgressListener = (): void => {
  if (renderProgressUnlisten) {
    renderProgressUnlisten()
    renderProgressUnlisten = null
  }
}

export const onExtractionProgress = (
  callback: (progress: ExtractionProgress) => void
): void => {
  if (extractionProgressUnlisten) {
    extractionProgressUnlisten()
    extractionProgressUnlisten = null
  }

  listen('extraction-progress', (event: Event<ExtractionProgress>) => {
    callback(event.payload)
  }).then((unlisten) => {
    extractionProgressUnlisten = unlisten
  })
}

export const removeExtractionProgressListener = (): void => {
  if (extractionProgressUnlisten) {
    extractionProgressUnlisten()
    extractionProgressUnlisten = null
  }
}

// Preferences / system paths
export const getDownloadsFolder = (): Promise<string> =>
  invoke('get_downloads_folder')

export const getPreferredOutputFolder = (): Promise<string> =>
  invoke('get_preferred_output_folder')

export const setPreferredOutputFolder = (folder: string): Promise<boolean> =>
  invoke('set_preferred_output_folder', { folder })

// App info
export const getAppVersion = (): Promise<string> =>
  invoke('get_app_version')

export const getAppIconPath = (): Promise<string | null> =>
  invoke('get_app_icon_path')

// Global API object for minimal migration changes
export const electronAPI = {
  selectImageSequence,
  selectSequenceFolder,
  selectZipFile,
  extractAndDetectZip,
  detectSequenceFromFolder,
  processDroppedFiles,
  selectOutputDirectory,
  selectOutputFile,
  browseDirectory,
  createDirectory,
  detectSequenceInfo,
  renderSequence,
  cancelRender,
  getJobHistory,
  saveJob,
  clearJobHistory,
  checkFFmpeg,
  getFFmpegPath,
  setFFmpegPath,
  browseFFmpegPath,
  onRenderProgress,
  removeRenderProgressListener,
  onExtractionProgress,
  removeExtractionProgressListener,
  getDownloadsFolder,
  getPreferredOutputFolder,
  setPreferredOutputFolder,
  getAppVersion,
  getAppIconPath
}
