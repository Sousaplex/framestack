import { useEffect, useState } from 'react'
import { RenderJob } from '@shared/types'
import { X, Clock, Zap, CheckCircle2, AlertCircle } from 'lucide-react'

interface JobProgressProps {
  job: RenderJob
  onCancel: () => void
}

export default function JobProgress({ job, onCancel }: JobProgressProps) {
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const progress = job.progress || {
    currentFrame: 0,
    totalFrames: job.inputSequence.frameCount,
    percentage: 0,
    fps: 0
  }

  const formatTime = (seconds?: number) => {
    if (!seconds && seconds !== 0) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatElapsed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isCompleted = job.status === 'completed'
  const isFailed = job.status === 'failed' || job.status === 'cancelled'

  return (
    <div className={`glass rounded-2xl p-6 border-2 ${
      isCompleted ? 'border-green-500/50 bg-green-500/10' : 
      isFailed ? 'border-red-500/50 bg-red-500/10' : 
      'border-blue-500/50'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-green-400">Render Complete!</h3>
            </>
          ) : isFailed ? (
            <>
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-red-400">
                {job.status === 'cancelled' ? 'Render Cancelled' : 'Render Failed'}
              </h3>
            </>
          ) : (
            <>
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <h3 className="text-lg font-semibold text-dark-text">Rendering...</h3>
            </>
          )}
        </div>
        {!isCompleted && !isFailed && (
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-xl transition-colors border border-red-500/30"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-sm text-dark-text2 mb-2">
            <span className="font-medium text-dark-text">{Math.round(progress.percentage)}%</span>
            <span>
              Frame {progress.currentFrame} / {progress.totalFrames}
            </span>
          </div>
          <div className="w-full bg-dark-surface2 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                isFailed ? 'bg-gradient-to-r from-red-500 to-red-600' :
                'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-dark-text2">Speed</div>
              <div className="font-medium text-dark-text">
                {progress.fps > 0 ? `${progress.fps.toFixed(1)} fps` : '--'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-dark-text2">ETA</div>
              <div className="font-medium text-dark-text">
                {isCompleted ? 'Done' : formatTime(progress.eta)}
              </div>
            </div>
          </div>
          <div>
            <div className="text-dark-text2">Elapsed</div>
            <div className="font-medium text-dark-text">
              {formatElapsed(elapsedTime)}
            </div>
          </div>
          <div>
            <div className="text-dark-text2">Format</div>
            <div className="font-medium text-dark-text">{job.format.name}</div>
          </div>
        </div>
        
        {job.error && (
          <div className="mt-4 p-3 glass-light border border-red-500/30 rounded-xl">
            <div className="text-sm font-medium text-red-400 mb-1">Error:</div>
            <div className="text-sm text-red-300">{job.error}</div>
          </div>
        )}

        {/* Output Path */}
        <div className="pt-4 border-t border-dark-border">
          <div className="text-xs text-dark-text2 mb-1">Output:</div>
          <div className="text-sm font-mono text-dark-text truncate" title={job.outputPath}>
            {job.outputPath}
          </div>
        </div>
      </div>
    </div>
  )
}
