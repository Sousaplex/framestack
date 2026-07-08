import { RenderJob } from '@shared/types'
import { History, CheckCircle2, XCircle, Clock, Loader2, Play, Plus, Trash2 } from 'lucide-react'

interface JobHistoryProps {
  jobs: RenderJob[]
  onSelectJob: (job: RenderJob) => void
  onNewJob: () => void
  onClearHistory: () => void
}

export default function JobHistory({ jobs, onSelectJob, onNewJob, onClearHistory }: JobHistoryProps) {
  const getStatusIcon = (status: RenderJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'in-progress':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-dark-text2" />
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with actions */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-dark-text" />
            <h2 className="text-lg font-semibold text-dark-text">Recent Jobs</h2>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onNewJob}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all text-sm font-medium shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4" />
            <span>New Job</span>
          </button>
          
          {jobs.length > 0 && (
            <button
              onClick={onClearHistory}
              className="px-3 py-2 glass-light text-red-400 rounded-xl hover:bg-red-500/20 border border-red-500/30 transition-all"
              title="Clear history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto p-4">
        {jobs.length === 0 ? (
          <div className="text-center text-dark-text2 py-8">
            <History className="w-12 h-12 mx-auto mb-3 text-dark-text2/50" />
            <p className="text-sm mb-4">No render history</p>
            <button
              onClick={onNewJob}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Job</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="w-full text-left p-3 glass-light rounded-xl border border-dark-border hover:border-blue-400/50 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-2 mb-2">
                  {getStatusIcon(job.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-dark-text truncate">
                        {job.format.name}
                      </span>
                      <span className="text-xs text-dark-text2">
                        {new Date(job.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs text-dark-text2 truncate" title={job.outputPath}>
                      {job.outputPath.split(/[/\\]/).pop() || job.outputPath}
                    </div>
                  </div>
                </div>
                
                {job.progress && job.status === 'in-progress' && (
                  <div className="mt-2">
                    <div className="w-full bg-dark-surface2 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                        style={{ width: `${job.progress.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-dark-text2 mt-1">
                      {job.progress.currentFrame} / {job.progress.totalFrames} frames
                    </div>
                  </div>
                )}

                {job.error && (
                  <div className="mt-2 text-xs text-red-400 truncate" title={job.error}>
                    {job.error}
                  </div>
                )}

                {job.status === 'completed' && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-dark-text2">
                    <Play className="w-3 h-3" />
                    <span>Click to reuse settings</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
