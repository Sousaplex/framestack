export interface ImageSequenceInfo {
  directory: string;
  pattern: string;
  firstFrame: number;
  lastFrame: number;
  frameCount: number;
  extension: string;
  width?: number;
  height?: number;
  hasAlpha: boolean;
  files: string[];
}

export interface VideoFormat {
  id: string;
  name: string;
  codec: string;
  extension: string;
  supportsAlpha: boolean;
  description: string;
  bitrate?: string;
  quality?: string;
}

export interface RenderJob {
  id: string;
  inputSequence: ImageSequenceInfo;
  outputPath: string;
  format: VideoFormat;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  timestamp: number;
  duration?: number;
  error?: string;
  progress?: {
    currentFrame: number;
    totalFrames: number;
    percentage: number;
    fps: number;
    eta?: number;
  };
}

export interface RenderProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  fps: number;
  eta?: number;
}

export interface DirectoryInfo {
  path: string;
  files: string[];
  directories: string[];
}

export interface ExtractionProgress {
  currentFile: number;
  totalFiles: number;
  percentage: number;
  currentFileName: string;
}
