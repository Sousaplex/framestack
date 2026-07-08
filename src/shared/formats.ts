import { VideoFormat } from './types'

export const VIDEO_FORMATS: VideoFormat[] = [
  {
    id: 'dnxhd',
    name: 'DNxHD',
    codec: 'dnxhd',
    extension: '.mov',
    supportsAlpha: false,
    description: 'DNxHD 220Mbps',
    bitrate: '220M'
  },
  {
    id: 'dnxhr',
    name: 'DNxHR HQX',
    codec: 'dnxhd',
    extension: '.mov',
    supportsAlpha: false,
    description: 'DNxHR HQX Profile',
    bitrate: '220M'
  },
  {
    id: 'prores4444',
    name: 'ProRes 4444',
    codec: 'prores_ks',
    extension: '.mov',
    supportsAlpha: true,
    description: 'ProRes 4444 with Alpha',
    quality: '4444'
  },
  {
    id: 'prores422',
    name: 'ProRes 422',
    codec: 'prores_ks',
    extension: '.mov',
    supportsAlpha: false,
    description: 'ProRes 422 HQ',
    quality: '422'
  },
  {
    id: 'h264',
    name: 'H.264',
    codec: 'libx264',
    extension: '.mp4',
    supportsAlpha: false,
    description: 'H.264 High Quality',
    quality: '18'
  },
  {
    id: 'h265',
    name: 'H.265',
    codec: 'libx265',
    extension: '.mp4',
    supportsAlpha: false,
    description: 'H.265 High Quality',
    quality: '18'
  },
  {
    id: 'cineform',
    name: 'CineForm',
    codec: 'cfhd',
    extension: '.avi',
    supportsAlpha: false,
    description: 'CineForm High Quality',
    quality: '4'
  },
  {
    id: 'av1',
    name: 'AV1',
    codec: 'libaom-av1',
    extension: '.mp4',
    supportsAlpha: false,
    description: 'AV1 High Quality',
    quality: '30'
  }
]

export function getVideoFormats(): VideoFormat[] {
  return VIDEO_FORMATS
}

export function getVideoFormat(id: string): VideoFormat | undefined {
  return VIDEO_FORMATS.find(f => f.id === id)
}
