import { useState, useEffect } from 'react'
import { ImageSequenceInfo, VideoFormat, RenderJob } from '@shared/types'
import { getVideoFormats } from '@shared/formats'
import FilePicker from './components/FilePicker'
import FormatSelector from './components/FormatSelector'
import OutputSettings from './components/OutputSettings'
import JobHistory from './components/JobHistory'
import JobProgress from './components/JobProgress'
import AboutModal from './components/AboutModal'
import FFmpegMissingBanner from './components/FFmpegMissingBanner'
import { useFFmpeg } from './hooks/useFFmpeg'
import { useJobHistory } from './hooks/useJobHistory'
import { Film, AlertCircle, Info } from 'lucide-react'

function App() {
  const [sequenceInfo, setSequenceInfo] = useState<ImageSequenceInfo | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null)
  const [outputPath, setOutputPath] = useState<string>('')
  const [currentJob, setCurrentJob] = useState<RenderJob | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState<string>('')
  
  // Force close modal on Escape key globally
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAbout) {
        setShowAbout(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showAbout])
  
  const { ffmpegAvailable, checking } = useFFmpeg()
  const { jobs, saveJob, refresh: refreshJobHistory } = useJobHistory()
  const formats = getVideoFormats()

  useEffect(() => {
    // Load app icon path and version
    window.electronAPI.getAppIconPath().then(path => {
      setLogoPath(path || null)
    })
    window.electronAPI.getAppVersion().then(version => {
      setAppVersion(version)
    })
  }, [])

  useEffect(() => {
    if (sequenceInfo && !selectedFormat) {
      // Auto-select ProRes4444 if alpha channel, otherwise ProRes422
      const defaultFormat = sequenceInfo.hasAlpha
        ? formats.find(f => f.id === 'prores4444')
        : formats.find(f => f.id === 'prores422')
      if (defaultFormat) {
        setSelectedFormat(defaultFormat)
      }
    }
  }, [sequenceInfo, formats])

  const handleRender = async () => {
    if (!sequenceInfo || !selectedFormat || !outputPath) {
      alert('Please select a sequence, format, and output path')
      return
    }

    const jobId = `job_${Date.now()}`
    const startTime = Date.now()
    
    console.log(`[Renderer] Starting render job: ${jobId}`)
    console.log(`[Renderer] Input: ${sequenceInfo.directory}/${sequenceInfo.pattern}`)
    console.log(`[Renderer] Output: ${outputPath}`)
    console.log(`[Renderer] Format: ${selectedFormat.name}`)
    console.log(`[Renderer] Frames: ${sequenceInfo.frameCount}`)
    
    const job: RenderJob = {
      id: jobId,
      inputSequence: sequenceInfo,
      outputPath,
      format: selectedFormat,
      status: 'in-progress',
      timestamp: Date.now(),
      progress: {
        currentFrame: 0,
        totalFrames: sequenceInfo.frameCount,
        percentage: 0,
        fps: 0
      }
    }

    setCurrentJob(job)
    await saveJob(job)

    // Set up progress listener before starting render
    const progressHandler = (id: string, progress: any) => {
      if (id === jobId) {
        console.log(
          `[Renderer] Progress: ${progress.percentage.toFixed(1)}% | ` +
          `Frame ${progress.currentFrame}/${progress.totalFrames} | ` +
          `FPS: ${progress.fps.toFixed(1)} | ` +
          `ETA: ${progress.eta ? Math.floor(progress.eta / 60) + 'm ' + Math.floor(progress.eta % 60) + 's' : '--'}`
        )
        setCurrentJob(prev => prev ? {
          ...prev,
          progress
        } : null)
      }
    }

    window.electronAPI.onRenderProgress(progressHandler)

    try {
      await window.electronAPI.renderSequence(jobId, sequenceInfo, outputPath, selectedFormat)
      
      // Wait a bit for final progress update
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`[Renderer] ✅ Render completed successfully in ${elapsed}s`)
      console.log(`[Renderer] Output saved to: ${outputPath}`)
      
      const completedJob: RenderJob = {
        ...job,
        status: 'completed',
        progress: {
          currentFrame: sequenceInfo.frameCount,
          totalFrames: sequenceInfo.frameCount,
          percentage: 100,
          fps: job.progress?.fps || 0
        }
      }
      await saveJob(completedJob)
      setCurrentJob(completedJob) // Keep showing completion status
      window.electronAPI.removeRenderProgressListener()
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setCurrentJob(null)
      }, 5000)
    } catch (error: any) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.error(`[Renderer] ❌ Render failed after ${elapsed}s:`, error.message)
      
      const failedJob: RenderJob = {
        ...job,
        status: 'failed',
        error: error.message
      }
      await saveJob(failedJob)
      setCurrentJob(failedJob) // Show error status
      window.electronAPI.removeRenderProgressListener()
      alert(`Render failed: ${error.message}`)
    }
  }

  const handleCancel = async () => {
    await window.electronAPI.cancelRender()
    if (currentJob) {
      const cancelledJob: RenderJob = {
        ...currentJob,
        status: 'cancelled'
      }
      await saveJob(cancelledJob)
      setCurrentJob(null)
    }
  }

  const handleNewJob = () => {
    setSequenceInfo(null)
    setSelectedFormat(null)
    setOutputPath('')
    setCurrentJob(null)
    setShowHistory(false)
  }

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all job history?')) {
      try {
        await window.electronAPI.clearJobHistory()
        // Refresh the job history to update the UI
        await refreshJobHistory()
      } catch (error: any) {
        alert(`Failed to clear history: ${error.message}`)
      }
    }
  }

  return (
    <div className="h-screen flex flex-col bg-dark-bg text-dark-text">
      {/* Header */}
      <header className="glass border-b border-dark-border px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {logoPath ? (
            <img 
              src={logoPath} 
              alt="FrameStack Logo" 
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Film className="w-5 h-5 text-white" />
            </div>
          )}
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            FrameStack
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {checking ? (
            <span className="text-sm text-dark-text2">Checking FFmpeg...</span>
          ) : !ffmpegAvailable ? (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">FFmpeg not found</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-green-400">FFmpeg Ready</span>
            </div>
          )}
          <button
            onClick={() => {
              console.log('[App] About button clicked, current state:', showAbout)
              setShowAbout(true)
            }}
            className="p-2 rounded-lg glass-light text-dark-text2 hover:text-dark-text transition-colors"
            title="About"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content - No scrolling layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Job History (always visible, collapsible) */}
        <div className={`transition-all duration-300 ${showHistory ? 'w-80' : 'w-0'} overflow-hidden border-r border-dark-border`}>
          <div className="w-80 h-full overflow-y-auto">
            <JobHistory
              jobs={jobs}
              onSelectJob={(job) => {
                setSequenceInfo(job.inputSequence)
                setSelectedFormat(job.format)
                setOutputPath(job.outputPath)
                setShowHistory(false)
              }}
              onNewJob={handleNewJob}
              onClearHistory={handleClearHistory}
            />
          </div>
        </div>

        {/* Main Content Area - Grid Layout */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* FFmpeg Missing Banner */}
          {!checking && !ffmpegAvailable && (
            <FFmpegMissingBanner onPathSelected={async () => {
              // Recheck FFmpeg after path is set
              const result = await window.electronAPI.checkFFmpeg()
              if (result.available) {
                window.location.reload() // Reload to update state
              }
            }} />
          )}

          {/* Top Section - Input & Format */}
          <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden">
            {/* Left: File Picker */}
            <div className="overflow-y-auto pr-2">
              <FilePicker
                onSequenceSelected={setSequenceInfo}
                sequenceInfo={sequenceInfo}
              />
            </div>

            {/* Right: Format Selector */}
            <div className="overflow-y-auto pl-2">
              {sequenceInfo ? (
                <FormatSelector
                  formats={formats}
                  selectedFormat={selectedFormat}
                  onFormatSelect={setSelectedFormat}
                  hasAlpha={sequenceInfo.hasAlpha}
                />
              ) : (
                <div className="glass rounded-2xl p-6 h-full flex items-center justify-center">
                  <p className="text-dark-text2 text-center">Select an image sequence first</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section - Output & Progress */}
          <div className="border-t border-dark-border p-4 space-y-4">
            {/* Output Settings */}
            {sequenceInfo && selectedFormat ? (
              <OutputSettings
                sequenceInfo={sequenceInfo}
                format={selectedFormat}
                outputPath={outputPath}
                onOutputPathChange={setOutputPath}
                onRender={handleRender}
                disabled={currentJob !== null || !ffmpegAvailable}
              />
            ) : null}

            {/* Progress Bar - Fixed at bottom when rendering */}
            {currentJob && (
              <JobProgress
                job={currentJob}
                onCancel={handleCancel}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar - History Toggle */}
        <div className="w-12 flex flex-col items-center py-4 border-l border-dark-border">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-lg transition-all ${
              showHistory 
                ? 'glass text-blue-400' 
                : 'glass-light text-dark-text2 hover:text-dark-text'
            }`}
            title={`${showHistory ? 'Hide' : 'Show'} History`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {jobs.length > 0 && (
            <span className="mt-2 text-xs text-dark-text2">{jobs.length}</span>
          )}
        </div>
      </div>

      {/* About Modal */}
      {showAbout && (
        <AboutModal
          isOpen={showAbout}
          onClose={() => {
            console.log('[App] Closing About modal')
            setShowAbout(false)
          }}
          logoPath={logoPath || undefined}
          version={appVersion}
        />
      )}
    </div>
  )
}

export default App
