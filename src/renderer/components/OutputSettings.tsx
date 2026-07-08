import { useState, useEffect } from 'react'
import { ImageSequenceInfo, VideoFormat } from '@shared/types'
import { generateOutputPath, suggestOutputName } from '../utils/naming'
import { join } from '../utils/path'
import { Save, FolderOpen, Sparkles, Play, FileText } from 'lucide-react'

interface OutputSettingsProps {
  sequenceInfo: ImageSequenceInfo
  format: VideoFormat
  outputPath: string
  onOutputPathChange: (path: string) => void
  onRender: () => void
  disabled: boolean
}

export default function OutputSettings({
  sequenceInfo,
  format,
  outputPath,
  onOutputPathChange,
  onRender,
  disabled
}: OutputSettingsProps) {
  const [suggestions] = useState(() => suggestOutputName(sequenceInfo, format))
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [preferredFolder, setPreferredFolder] = useState<string>('')

  // Initialize preferred folder on mount
  useEffect(() => {
    const initPreferredFolder = async () => {
      try {
        const folder = await window.electronAPI.getPreferredOutputFolder()
        setPreferredFolder(folder)
      } catch (error) {
        console.error('Failed to get preferred folder:', error)
      }
    }
    initPreferredFolder()
  }, [])

  // Auto-set output path when sequence or format changes
  useEffect(() => {
    if (sequenceInfo && format) {
      const initializeOutputPath = async () => {
        try {
          const defaultFolder = preferredFolder || await window.electronAPI.getPreferredOutputFolder()
          if (!preferredFolder) {
            setPreferredFolder(defaultFolder)
          }
          const fileName = suggestOutputName(sequenceInfo, format)[0]
          const fullPath = join(defaultFolder, fileName)
          onOutputPathChange(fullPath)
        } catch (error) {
          console.error('Failed to get preferred folder:', error)
          // Fallback to sequence directory
          const fileName = suggestOutputName(sequenceInfo, format)[0]
          const fullPath = generateOutputPath(sequenceInfo, format)
          onOutputPathChange(fullPath)
        }
      }
      initializeOutputPath()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequenceInfo, format])

  const handleSelectDirectory = async () => {
    const dir = await window.electronAPI.selectOutputDirectory()
    if (dir) {
      // Set as preferred folder
      await window.electronAPI.setPreferredOutputFolder(dir)
      setPreferredFolder(dir)
      const fileName = suggestOutputName(sequenceInfo, format)[0]
      const fullPath = join(dir, fileName)
      onOutputPathChange(fullPath)
    }
  }

  const handleSelectFile = async () => {
    const defaultPath = outputPath || generateOutputPath(sequenceInfo, format)
    const path = await window.electronAPI.selectOutputFile(defaultPath)
    if (path) {
      onOutputPathChange(path)
    }
  }

  const handleUseSuggestion = (suggestion: string) => {
    // Use preferred folder if available, otherwise use current output path directory or sequence directory
    let dir = preferredFolder || sequenceInfo.directory
    if (!preferredFolder && outputPath) {
      const lastSep = Math.max(outputPath.lastIndexOf('/'), outputPath.lastIndexOf('\\'))
      if (lastSep >= 0) {
        dir = outputPath.substring(0, lastSep)
      }
    }
    const fullPath = join(dir, suggestion)
    onOutputPathChange(fullPath)
    setShowSuggestions(false)
  }

  const canRender = outputPath && !disabled

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
          <Save className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-dark-text mb-1">Output Settings</h2>
          <p className="text-sm text-dark-text2">Choose where to save the rendered video</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Output Path */}
        <div>
          <label className="block text-sm font-medium text-dark-text2 mb-2">
            Output Path
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={outputPath}
              onChange={(e) => onOutputPathChange(e.target.value)}
              placeholder={generateOutputPath(sequenceInfo, format)}
              className="flex-1 px-4 py-2 glass-light border border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-dark-text placeholder-dark-text2"
            />
            <button
              onClick={handleSelectFile}
              className="px-4 py-2 glass-light text-dark-text rounded-xl hover:bg-dark-surface2 transition-colors border border-dark-border"
              title="Browse for file"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={handleSelectDirectory}
              className="px-4 py-2 glass-light text-dark-text rounded-xl hover:bg-dark-surface2 transition-colors border border-dark-border"
              title="Select directory (sets as default)"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Smart Suggestions */}
        <div className="relative">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>More naming suggestions</span>
          </button>
          
          {showSuggestions && (
            <div className="mt-2 p-3 glass-light rounded-xl border border-dark-border">
              <p className="text-xs text-dark-text2 mb-2">Alternative names:</p>
              <div className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleUseSuggestion(suggestion)}
                    className="block w-full text-left px-3 py-2 text-sm text-dark-text hover:bg-dark-surface2 rounded-lg border border-transparent hover:border-dark-border transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Render Button */}
        <div className="pt-4 border-t border-dark-border">
          <button
            onClick={onRender}
            disabled={!canRender}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl"
          >
            <Play className="w-5 h-5" />
            <span>Start Render</span>
          </button>
        </div>
      </div>
    </div>
  )
}
