import Store from 'electron-store'
import { RenderJob } from '../shared/types'

interface StoreSchema {
  jobs: RenderJob[]
  preferences: {
    defaultOutputFolder?: string
    ffmpegPath?: string
  }
}

export class JobStore {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'jobs',
      defaults: {
        jobs: [],
        preferences: {}
      }
    })
  }

  getPreferences() {
    return this.store.get('preferences', {})
  }

  setDefaultOutputFolder(folder: string) {
    const preferences = this.store.get('preferences', {})
    this.store.set('preferences', {
      ...preferences,
      defaultOutputFolder: folder
    })
  }

  setFFmpegPath(path: string) {
    const preferences = this.store.get('preferences', {})
    this.store.set('preferences', {
      ...preferences,
      ffmpegPath: path
    })
  }

  save(job: RenderJob) {
    const jobs = this.store.get('jobs', [])
    const existingIndex = jobs.findIndex(j => j.id === job.id)
    
    if (existingIndex >= 0) {
      jobs[existingIndex] = job
    } else {
      jobs.push(job)
    }

    // Keep only last 50 jobs
    const sortedJobs = jobs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50)
    this.store.set('jobs', sortedJobs)
  }

  getAll(): RenderJob[] {
    return this.store.get('jobs', [])
  }

  get(id: string): RenderJob | undefined {
    const jobs = this.store.get('jobs', [])
    return jobs.find(j => j.id === id)
  }

  delete(id: string) {
    const jobs = this.store.get('jobs', [])
    const filtered = jobs.filter(j => j.id !== id)
    this.store.set('jobs', filtered)
  }

  clear() {
    this.store.set('jobs', [])
  }
}
