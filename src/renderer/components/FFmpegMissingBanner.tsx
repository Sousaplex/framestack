import { useState } from 'react'
import { AlertCircle, FolderOpen, CheckCircle2, XCircle } from 'lucide-react'

interface FFmpegMissingBannerProps {
  onPathSelected: () => void
}

export default function FFmpegMissingBanner({ onPathSelected }: FFmpegMissingBannerProps) {
  const [browsing, setBrowsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleBrowse = async () => {
    try {
      setBrowsing(true)
      setError(null)
      setSuccess(false)

      const path = await window.electronAPI.browseFFmpegPath()
      if (!path) {
        setBrowsing(false)
        return
      }

      // Validate and set the path
      const result = await window.electronAPI.setFFmpegPath(path)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onPathSelected()
        }, 1000)
      } else {
        setError(result.error || 'Failed to set FFmpeg path')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to browse for FFmpeg')
    } finally {
      setBrowsing(false)
    }
  }

  return (
    <div className="mx-4 mt-4 p-4 glass border border-red-500/50 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-400 mb-2">FFmpeg Required</h3>
          <p className="text-xs text-dark-text2 mb-3">
            This application requires FFmpeg to be installed on your system. FFmpeg is not included with this app - you must install it separately.
          </p>
          
          {success ? (
            <div className="flex items-center gap-2 text-green-400 text-xs mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>FFmpeg path set successfully! Reloading...</span>
            </div>
          ) : (
            <>
              <button
                onClick={handleBrowse}
                disabled={browsing}
                className="mb-3 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-sm text-blue-400 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                {browsing ? 'Browsing...' : 'Browse for FFmpeg Executable'}
              </button>
              
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs mb-2">
                  <XCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}

          <div className="text-xs text-dark-text2 space-y-1">
            <p><strong>Installation Instructions:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><strong>macOS:</strong> <code className="bg-dark-surface2 px-1 rounded">brew install ffmpeg</code></li>
              <li><strong>Linux:</strong> <code className="bg-dark-surface2 px-1 rounded">sudo apt-get install ffmpeg</code> or <code className="bg-dark-surface2 px-1 rounded">sudo yum install ffmpeg</code></li>
              <li><strong>Windows:</strong> Download from <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">ffmpeg.org</a> and add to PATH</li>
            </ul>
            <p className="mt-2 text-dark-text2">
              Or use the button above to manually select your FFmpeg executable if it's installed in a custom location.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
