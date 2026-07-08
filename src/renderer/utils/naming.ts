import { ImageSequenceInfo, VideoFormat } from '@shared/types'
import { basename } from './path'

export function generateOutputName(
  sequenceInfo: ImageSequenceInfo,
  format: VideoFormat,
  includeTimestamp: boolean = false
): string {
  // Extract base name from pattern
  let baseName = sequenceInfo.pattern
  
  // Remove frame number patterns (%04d, %d, etc.)
  baseName = baseName.replace(/%0?\d*d/g, '')
  
  // Remove extension
  baseName = baseName.replace(/\.[^.]+$/, '')
  
  // Clean up common separators
  baseName = baseName.replace(/[-_]+$/, '')
  
  // If baseName is empty or just numbers, use directory name
  if (!baseName || /^\d+$/.test(baseName)) {
    const dirParts = sequenceInfo.directory.split(/[/\\]/)
    baseName = dirParts[dirParts.length - 1] || 'output'
  }
  
  // Add format suffix
  const formatSuffix = format.id.replace(/([A-Z])/g, '_$1').toLowerCase()
  baseName = `${baseName}_${formatSuffix}`
  
  // Add resolution if different from input (optional, could be enhanced)
  // Add timestamp if requested
  if (includeTimestamp) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    baseName = `${baseName}_${timestamp}`
  }
  
  // Add extension
  return `${baseName}${format.extension}`
}

export function generateOutputPath(
  sequenceInfo: ImageSequenceInfo,
  format: VideoFormat,
  outputDirectory?: string,
  includeTimestamp: boolean = false
): string {
  const fileName = generateOutputName(sequenceInfo, format, includeTimestamp)
  const directory = outputDirectory || sequenceInfo.directory
  // Detect separator from directory path
  const separator = directory.includes('\\') ? '\\' : '/'
  const cleanDir = directory.replace(/[/\\]+$/, '')
  return cleanDir + separator + fileName
}

export function suggestOutputName(
  sequenceInfo: ImageSequenceInfo,
  format: VideoFormat
): string[] {
  const suggestions: string[] = []
  
  // Basic suggestion
  suggestions.push(generateOutputName(sequenceInfo, format, false))
  
  // With timestamp
  suggestions.push(generateOutputName(sequenceInfo, format, true))
  
  // Try to extract meaningful name from first file
  if (sequenceInfo.files.length > 0) {
    const firstFile = basename(sequenceInfo.files[0])
    const match = firstFile.match(/^(.+?)[_\d]+\./)
    if (match && match[1]) {
      const cleanName = match[1].replace(/[-_]+$/, '')
      const withFormat = `${cleanName}_${format.id}${format.extension}`
      if (!suggestions.includes(withFormat)) {
        suggestions.push(withFormat)
      }
    }
  }
  
  return suggestions.slice(0, 3) // Return top 3 suggestions
}
