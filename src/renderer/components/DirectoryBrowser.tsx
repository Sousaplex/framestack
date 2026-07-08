import { useState, useEffect } from 'react'
import { DirectoryInfo } from '@shared/types'
import { Folder, FolderOpen, File, ChevronRight, Plus, Home } from 'lucide-react'
import { join, basename } from '../utils/path'

interface DirectoryBrowserProps {
  initialPath?: string
  onPathSelect?: (path: string) => void
}

export default function DirectoryBrowser({ initialPath, onPathSelect }: DirectoryBrowserProps) {
  const getHomeDir = () => {
    if (typeof window !== 'undefined' && (window as any).process) {
      return (window as any).process.env.HOME || (window as any).process.env.USERPROFILE || '/'
    }
    return '/'
  }
  
  const [currentPath, setCurrentPath] = useState(initialPath || getHomeDir())
  const [directoryInfo, setDirectoryInfo] = useState<DirectoryInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)

  useEffect(() => {
    loadDirectory()
  }, [currentPath])

  const loadDirectory = async () => {
    try {
      setLoading(true)
      setError(null)
      const info = await window.electronAPI.browseDirectory(currentPath)
      setDirectoryInfo(info)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDirectoryClick = (dirName: string) => {
    const newPath = join(currentPath, dirName)
    setCurrentPath(newPath)
  }

  const handleFileClick = (fileName: string) => {
    const filePath = join(currentPath, fileName)
    onPathSelect?.(filePath)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const newPath = await window.electronAPI.createDirectory(currentPath, newFolderName)
      setNewFolderName('')
      setShowNewFolder(false)
      await loadDirectory()
      setCurrentPath(newPath)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path)
  }

  const getBreadcrumbs = () => {
    const parts = currentPath.split(/[/\\]/).filter(Boolean)
    const breadcrumbs: string[] = []
    let current = ''
    const isWindows = currentPath.includes('\\')

    // Add home/root
    if (isWindows && parts.length > 0) {
      current = parts[0] + '\\'
      breadcrumbs.push(current)
      parts.shift()
    } else {
      breadcrumbs.push('/')
      current = '/'
    }

    parts.forEach((part) => {
      current = join(current, part)
      breadcrumbs.push(current)
    })

    return breadcrumbs
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-full flex flex-col">
      <div className="mb-4">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm mb-3 flex-wrap">
          {getBreadcrumbs().map((path, index) => {
            const isLast = index === getBreadcrumbs().length - 1
            const isWindows = path.includes('\\')
            const displayName = index === 0 
              ? (isWindows ? path : 'Home')
              : basename(path)

            return (
              <div key={path} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
                <button
                  onClick={() => handleBreadcrumbClick(path)}
                  className={`px-2 py-1 rounded hover:bg-gray-100 ${
                    isLast ? 'font-medium text-gray-900' : 'text-gray-600'
                  }`}
                  disabled={isLast}
                >
                  {displayName}
                </button>
              </div>
            )
          })}
        </div>

        {/* Create Folder */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Folder</span>
          </button>
        </div>

        {showNewFolder && (
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              placeholder="Folder name"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Directory Contents */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : (
          <div className="space-y-1">
            {/* Directories */}
            {directoryInfo?.directories.map((dir) => (
              <button
                key={dir}
                onClick={() => handleDirectoryClick(dir)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-900">{dir}</span>
              </button>
            ))}

            {/* Files */}
            {directoryInfo?.files.map((file) => (
              <button
                key={file}
                onClick={() => handleFileClick(file)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
              >
                <File className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{file}</span>
              </button>
            ))}

            {directoryInfo && directoryInfo.directories.length === 0 && directoryInfo.files.length === 0 && (
              <div className="text-center text-gray-500 py-8 text-sm">Empty directory</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
