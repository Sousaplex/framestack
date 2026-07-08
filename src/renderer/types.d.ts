import { ImageSequenceInfo, VideoFormat, RenderJob, RenderProgress, DirectoryInfo } from '@shared/types'

declare global {
  interface Window {
    electronAPI: {
      selectImageSequence: () => Promise<string[] | null>
      selectSequenceFolder: () => Promise<string | null>
      selectZipFile: (allowMultiple?: boolean) => Promise<string | string[] | null>
      extractAndDetectZip: (zipPath: string | string[], existingTempDir?: string) => Promise<string[]>
      detectSequenceFromFolder: (folderPath: string) => Promise<string[]>
      processDroppedFiles: (filePaths: string[], existingTempDir?: string) => Promise<string[]>
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

export {}
