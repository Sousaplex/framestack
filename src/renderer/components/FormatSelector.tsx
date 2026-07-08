import { VideoFormat } from '@shared/types'
import { Film, Check } from 'lucide-react'

interface FormatSelectorProps {
  formats: VideoFormat[]
  selectedFormat: VideoFormat | null
  onFormatSelect: (format: VideoFormat) => void
  hasAlpha: boolean
}

export default function FormatSelector({
  formats,
  selectedFormat,
  onFormatSelect,
  hasAlpha
}: FormatSelectorProps) {
  // Filter formats based on alpha channel support
  const availableFormats = hasAlpha
    ? formats // Show all formats if alpha is present
    : formats.filter(f => !f.supportsAlpha || f.id === 'prores422') // Show non-alpha formats + ProRes422

  return (
    <div className="glass rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Film className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-dark-text mb-1">Output Format</h2>
          <p className="text-sm text-dark-text2">
            {hasAlpha && (
              <span className="text-green-400 font-medium">Alpha channel detected - formats with alpha support available</span>
            )}
            {!hasAlpha && (
              <span>Select a video format for encoding</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 gap-3">
          {availableFormats.map((format) => {
            const isSelected = selectedFormat?.id === format.id
            const isRecommended = hasAlpha && format.supportsAlpha && format.id === 'prores4444'
            
            return (
              <button
                key={format.id}
                onClick={() => onFormatSelect(format)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-400 bg-gradient-to-br from-blue-500/20 to-purple-500/20 shadow-lg'
                    : 'border-dark-border glass-light hover:border-blue-400/50 hover:shadow-md'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
                
                {isRecommended && !isSelected && (
                  <div className="absolute top-3 right-3">
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-lg border border-green-500/30">
                      Recommended
                    </span>
                  </div>
                )}
                
                <div className="pr-10">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-dark-text">{format.name}</h3>
                    {format.supportsAlpha && (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-lg border border-purple-500/30">
                        Alpha
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-dark-text2 mb-2">{format.description}</p>
                  <div className="flex items-center gap-4 text-xs text-dark-text2">
                    <span>Codec: {format.codec}</span>
                    {format.bitrate && <span>Bitrate: {format.bitrate}</span>}
                    {format.quality && <span>Quality: {format.quality}</span>}
                    <span className="uppercase">{format.extension.replace('.', '')}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
