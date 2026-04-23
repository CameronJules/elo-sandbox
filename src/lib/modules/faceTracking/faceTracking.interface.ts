export interface NormalizedLandmark {
  x: number
  y: number
  z: number
}

export type EmotionHint = 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry'

export interface FaceFrame {
  nose: { x: number; y: number }
  landmarks: NormalizedLandmark[][]
  emotion: EmotionHint
  confidence: number
  fps: number
}

export type Unsubscribe = () => void

export interface FaceTrackingModule {
  start(video: HTMLVideoElement): Promise<void>
  stop(): void
  subscribe(cb: (frame: FaceFrame) => void): Unsubscribe
}
