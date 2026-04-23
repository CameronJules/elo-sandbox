import { useEffect, useRef, useState, useCallback } from 'react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { webcamService } from '@/lib/services/webcamService'
import { faceTrackingModule } from '@/lib/modules/faceTracking/mediaPipeFaceTracking'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'
import { logger } from '@/lib/observability/logger'
import type { FaceFrame } from '@/lib/modules/faceTracking/faceTracking.interface'

export function WebcamWithOverlay() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fps, setFps] = useState(0)
  const { faceTracker, setFaceTrackerField } = useEditorStore()
  const prevRef = useRef({ x: 0.5, y: 0.5 })

  const drawOverlay = useCallback((frame: FaceFrame) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!faceTracker.overlay) return

    for (const face of frame.landmarks) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      for (const lm of face) {
        ctx.beginPath()
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
      // Nose tip highlight
      const nose = frame.nose
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(nose.x * canvas.width, nose.y * canvas.height, 5, 0, Math.PI * 2)
      ctx.fill()
    }

    setFps(frame.fps)
  }, [faceTracker.overlay])

  useEffect(() => {
    let started = false
    async function start() {
      if (!videoRef.current) return
      try {
        const stream = await webcamService.start()
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        logger.log('face', 'Webcam started')
        await faceTrackingModule.start(videoRef.current)
        logger.log('face', 'Face tracking started')
        started = true
        setFaceTrackerField('active', true)
      } catch (err) {
        logger.error('face', 'Failed to start webcam/face tracking', err)
      }
    }
    start()
    const unsub = faceTrackingModule.subscribe((frame) => {
      drawOverlay(frame)
      // Smooth + apply sensitivity
      const smooth = useEditorStore.getState().faceTracker.smoothing
      const sens = useEditorStore.getState().faceTracker.sensitivity
      const prev = prevRef.current
      const nx = prev.x + (1 - smooth) * ((frame.nose.x - 0.5) * sens + 0.5 - prev.x)
      const ny = prev.y + (1 - smooth) * ((frame.nose.y - 0.5) * sens + 0.5 - prev.y)
      prevRef.current = { x: nx, y: ny }
      useEditorStore.getState().setLookAt(nx, ny)
    })

    return () => {
      unsub()
      if (started) {
        faceTrackingModule.stop()
        webcamService.stop()
        setFaceTrackerField('active', false)
      }
    }
  }, [])

  return (
    <div className="relative w-full overflow-hidden rounded-md bg-black">
      <video ref={videoRef} className="w-full" muted playsInline />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      {fps > 0 && (
        <Badge className="absolute top-2 right-2 font-mono text-xs" variant="secondary">
          {fps} FPS
        </Badge>
      )}
      <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-md bg-background/80 px-2 py-1 backdrop-blur-sm">
        <Label className="text-xs">Overlay</Label>
        <Switch
          checked={faceTracker.overlay}
          onCheckedChange={(v) => setFaceTrackerField('overlay', v)}
          className="scale-75"
        />
      </div>
    </div>
  )
}
