import { useState, useEffect, useCallback } from 'react'
import { ImageSequenceInfo, VideoFormat, RenderProgress } from '@shared/types'

export function useFFmpeg() {
  const [ffmpegAvailable, setFfmpegAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkFFmpeg()
  }, [])

  const checkFFmpeg = async () => {
    try {
      setChecking(true)
      if (!window.electronAPI) {
        console.warn('electronAPI not available yet')
        setFfmpegAvailable(false)
        return
      }
      const result = await window.electronAPI.checkFFmpeg()
      setFfmpegAvailable(result.available)
    } catch (error) {
      console.error('Failed to check FFmpeg:', error)
      setFfmpegAvailable(false)
    } finally {
      setChecking(false)
    }
  }

  const renderSequence = useCallback(async (
    jobId: string,
    sequenceInfo: ImageSequenceInfo,
    outputPath: string,
    format: VideoFormat,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<void> => {
    // Set up progress listener
    if (onProgress) {
      window.electronAPI.onRenderProgress((id, progress) => {
        if (id === jobId) {
          onProgress(progress)
        }
      })
    }

    try {
      await window.electronAPI.renderSequence(jobId, sequenceInfo, outputPath, format)
    } finally {
      // Clean up listener
      if (onProgress) {
        window.electronAPI.removeRenderProgressListener()
      }
    }
  }, [])

  const cancelRender = useCallback(async () => {
    return await window.electronAPI.cancelRender()
  }, [])

  return {
    ffmpegAvailable,
    checking,
    checkFFmpeg,
    renderSequence,
    cancelRender
  }
}
