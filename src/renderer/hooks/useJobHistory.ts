import { useState, useEffect } from 'react'
import { RenderJob } from '@shared/types'

export function useJobHistory() {
  const [jobs, setJobs] = useState<RenderJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      setLoading(true)
      if (!window.electronAPI) {
        console.warn('electronAPI not available yet')
        return
      }
      const history = await window.electronAPI.getJobHistory()
      setJobs(history.sort((a, b) => b.timestamp - a.timestamp))
    } catch (error) {
      console.error('Failed to load job history:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveJob = async (job: RenderJob) => {
    try {
      await window.electronAPI.saveJob(job)
      await loadJobs()
    } catch (error) {
      console.error('Failed to save job:', error)
      throw error
    }
  }

  const getJob = (id: string): RenderJob | undefined => {
    return jobs.find(j => j.id === id)
  }

  return {
    jobs,
    loading,
    saveJob,
    getJob,
    refresh: loadJobs
  }
}
