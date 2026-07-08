import { useState, useEffect } from 'react'
import { X, Download, ChevronDown, ChevronUp } from 'lucide-react'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
  logoPath?: string
  version?: string
}

export default function AboutModal({ isOpen, onClose, logoPath, version }: AboutModalProps) {
  const [showFFmpegGuide, setShowFFmpegGuide] = useState(false)
  
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])
  
  // Ensure modal doesn't render when closed - double check
  if (!isOpen) {
    return null
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        // Only close if clicking the backdrop, not the modal content
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div 
        className="glass rounded-2xl p-8 max-w-md w-full mx-4 border border-dark-border shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-dark-text2 hover:text-dark-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        {logoPath && (
          <div className="flex justify-center mb-6">
            <img 
              src={logoPath} 
              alt="FrameStack Logo" 
              className="w-24 h-24 rounded-xl object-cover shadow-lg"
            />
          </div>
        )}

        {/* App Name */}
        <h2 id="about-modal-title" className="text-2xl font-bold text-center mb-1 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          FrameStack
        </h2>
        
        {/* Version */}
        {version && (
          <p className="text-center text-sm text-dark-text2 mb-6">
            Version {version}
          </p>
        )}

        {/* Description */}
        <p className="text-center text-dark-text2 mb-6">
          An Electron application for converting image sequences to high-quality video formats using FFmpeg.
        </p>

        {/* License */}
        <div className="border-t border-dark-border pt-6 mb-4">
          <div className="text-center">
            <p className="text-sm text-dark-text2 mb-1">License</p>
            <p className="text-lg font-semibold text-dark-text">MIT License</p>
            <p className="text-xs text-dark-text2 mt-2">
              Copyright (c) {new Date().getFullYear()}
            </p>
            <p className="text-xs text-dark-text2 mt-3 leading-relaxed px-4">
              Permission is hereby granted, free of charge, to any person obtaining a copy
              of this software and associated documentation files, to deal in the Software
              without restriction, including without limitation the rights to use, copy, modify,
              merge, publish, distribute, sublicense, and/or sell copies of the Software.
            </p>
          </div>
        </div>

        {/* FFmpeg Installation Guide */}
        <div className="border-t border-dark-border pt-6">
          <button
            onClick={() => setShowFFmpegGuide(!showFFmpegGuide)}
            className="w-full flex items-center justify-between p-3 glass-light rounded-xl hover:bg-dark-surface2 transition-colors border border-dark-border"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-dark-text">FFmpeg Installation Guide</span>
            </div>
            {showFFmpegGuide ? (
              <ChevronUp className="w-4 h-4 text-dark-text2" />
            ) : (
              <ChevronDown className="w-4 h-4 text-dark-text2" />
            )}
          </button>
          
          {showFFmpegGuide && (
            <div className="mt-3 p-4 glass-light rounded-xl border border-dark-border">
              <div className="text-xs text-dark-text2 space-y-3">
                <p>
                  <strong className="text-dark-text">This application requires FFmpeg</strong> to be installed on your system. 
                  FFmpeg is not included with this app - you must install it separately.
                </p>
                
                <div>
                  <p className="font-semibold text-dark-text mb-2">Installation Instructions:</p>
                  <ul className="space-y-2 ml-2">
                    <li>
                      <strong className="text-dark-text">macOS:</strong>
                      <div className="mt-1 p-2 bg-dark-surface2 rounded font-mono text-xs">
                        brew install ffmpeg
                      </div>
                    </li>
                    <li>
                      <strong className="text-dark-text">Linux:</strong>
                      <div className="mt-1 space-y-1">
                        <div className="p-2 bg-dark-surface2 rounded font-mono text-xs">
                          sudo apt-get install ffmpeg
                        </div>
                        <div className="p-2 bg-dark-surface2 rounded font-mono text-xs">
                          sudo yum install ffmpeg
                        </div>
                      </div>
                    </li>
                    <li>
                      <strong className="text-dark-text">Windows:</strong>
                      <div className="mt-1">
                        <p className="mb-1">Download from:</p>
                        <a 
                          href="https://ffmpeg.org/download.html" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          ffmpeg.org/download.html
                        </a>
                        <p className="mt-1">Add FFmpeg to your system PATH after installation.</p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <p className="pt-2 border-t border-dark-border">
                  <strong className="text-dark-text">After installing FFmpeg:</strong> Restart this application and ensure FFmpeg is available in your system PATH.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Codec Licensing Disclaimer */}
        <div className="border-t border-dark-border pt-6">
          <div className="text-center">
            <p className="text-sm font-semibold text-yellow-400 mb-2">⚠️ Codec Licensing Notice</p>
            <div className="text-xs text-dark-text2 leading-relaxed px-2 space-y-2 text-left">
              <p>
                <strong>This application uses FFmpeg</strong>, which may include codecs with various licensing requirements:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>DNxHD/DNxHR</strong>: Proprietary Avid codec. Commercial use may require licensing from Avid.</li>
                <li><strong>ProRes</strong>: Proprietary Apple codec. FFmpeg's implementation is unofficial and may have compatibility issues.</li>
                <li><strong>H.264/H.265</strong>: May require GPL compliance or commercial licenses from x264/x265 developers, and separate patent licensing.</li>
                <li><strong>CineForm</strong>: Open source, free for commercial use.</li>
                <li><strong>AV1</strong>: BSD licensed, free for commercial use.</li>
              </ul>
              <p className="mt-2">
                <strong>You are responsible</strong> for ensuring your FFmpeg installation and codec usage complies with applicable licenses. 
                This application does not include FFmpeg binaries - you must install FFmpeg separately.
              </p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
