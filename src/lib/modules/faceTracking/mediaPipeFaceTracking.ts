import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type { FaceTrackingModule, FaceFrame, EmotionHint, Unsubscribe } from './faceTracking.interface'
import { logger } from '@/lib/observability/logger'
import { useTelemetry } from '@/lib/observability/telemetryStore'

const NOSE_TIP_INDEX = 1

function detectEmotion(result: FaceLandmarkerResult): EmotionHint {
  const blendshapes = result.faceBlendshapes?.[0]?.categories
  if (!blendshapes) return 'neutral'
  const get = (name: string) => blendshapes.find((c) => c.categoryName === name)?.score ?? 0
  const smile = (get('mouthSmileLeft') + get('mouthSmileRight')) / 2
  const sad = (get('mouthFrownLeft') + get('mouthFrownRight')) / 2
  const brow = (get('browDownLeft') + get('browDownRight')) / 2
  const surprise = (get('browInnerUp') + get('browOuterUpLeft') + get('browOuterUpRight')) / 3
  if (smile > 0.5) return 'happy'
  if (sad > 0.4) return 'sad'
  if (surprise > 0.5) return 'surprised'
  if (brow > 0.5) return 'angry'
  return 'neutral'
}

class MediaPipeFaceTracking implements FaceTrackingModule {
  private landmarker: FaceLandmarker | null = null
  private running = false
  private listeners = new Set<(frame: FaceFrame) => void>()
  private lastTs = 0
  private frameCount = 0
  private fpsTs = 0
  private fps = 0
  private rafId = 0

  async start(video: HTMLVideoElement): Promise<void> {
    logger.log('face', 'Initializing MediaPipe FaceLandmarker')
    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    )
    this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
    })
    this.running = true
    logger.log('face', 'FaceLandmarker ready — starting detection loop')
    this.loop(video)
  }

  private loop(video: HTMLVideoElement) {
    if (!this.running || !this.landmarker) return
    this.rafId = requestAnimationFrame(() => {
      if (video.readyState < 2) {
        this.loop(video)
        return
      }
      const now = performance.now()
      const result = this.landmarker!.detectForVideo(video, now)

      // FPS
      this.frameCount++
      if (now - this.fpsTs >= 1000) {
        this.fps = this.frameCount
        this.frameCount = 0
        this.fpsTs = now
      }

      if (result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks
        const nose = landmarks[0][NOSE_TIP_INDEX]
        const emotion = detectEmotion(result)
        const frame: FaceFrame = {
          nose: { x: nose.x, y: nose.y },
          landmarks,
          emotion,
          confidence: result.faceBlendshapes?.[0]?.categories?.[0]?.score ?? 1,
          fps: this.fps,
        }
        this.listeners.forEach((cb) => cb(frame))
        useTelemetry.getState().updateFace({
          nose: { x: nose.x, y: nose.y },
          fps: this.fps,
          emotion,
          confidence: frame.confidence,
        })
      }
      this.lastTs = now
      this.loop(video)
    })
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.landmarker?.close()
    this.landmarker = null
    logger.log('face', 'Face tracking stopped')
  }

  subscribe(cb: (frame: FaceFrame) => void): Unsubscribe {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
}

export const faceTrackingModule: FaceTrackingModule = new MediaPipeFaceTracking()
