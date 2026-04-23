import { useRef, useCallback } from 'react'
import { RiveViewer } from './RiveViewer'
import { WebcamWithOverlay } from './WebcamWithOverlay'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'
import { useTelemetry } from '@/lib/observability/telemetryStore'
import { saveRiveFile, bufferToBlobUrl } from '@/lib/services/riveFileStorage'
import { riveControllerRef } from '@/lib/viewmodels/riveController'
import { Upload, Trash2 } from 'lucide-react'

function useRiveUpload() {
  const resetRive = useEditorStore((s) => s.resetRive)

  return useCallback(async (file: File) => {
    if (!file.name.endsWith('.riv')) return
    const buffer = await file.arrayBuffer()
    await saveRiveFile(buffer)
    riveControllerRef.current = null
    resetRive(bufferToBlobUrl(buffer), file.name)
  }, [resetRive])
}

function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/30 p-12 text-center transition-colors hover:border-muted-foreground/60"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <Upload className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Drop a .riv file here</p>
          <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".riv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
      </div>
    </div>
  )
}

export function MainCanvas() {
  const { lookAt, rive, setViewModelName, setRiveField, clearRive } = useEditorStore()
  const faceEmotion = useTelemetry((s) => s.face.emotion)
  const handleFile = useRiveUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasFile = !!rive.src

  return (
    <div className="flex flex-col h-full">
      {/* Canvas header */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <span className="text-sm font-medium">Rive Animation</span>
        {hasFile && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-3" />
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={() => { riveControllerRef.current = null; clearRive() }}
            >
              <Trash2 className="size-3" />
              Remove
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".riv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {/* View model + state machine selectors — only when a file is loaded */}
      {hasFile && (
        <div className="flex items-center gap-4 border-b px-4 py-2">
          <span className="text-xs text-muted-foreground">View Model</span>
          {rive.availableViewModels.length > 0 ? (
            <Select value={rive.viewModelName} onValueChange={setViewModelName}>
              <SelectTrigger className="h-7 w-48 text-xs">
                <SelectValue placeholder="Select view model…" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {rive.availableViewModels.map((vm) => (
                    <SelectItem key={vm} value={vm} className="text-xs">{vm}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-muted-foreground italic">Loading…</span>
          )}

          <span className="text-xs text-muted-foreground">State Machine</span>
          {rive.availableStateMachines.length > 0 ? (
            <Select value={rive.stateMachineName} onValueChange={(v) => setRiveField('stateMachineName', v)}>
              <SelectTrigger className="h-7 w-48 text-xs">
                <SelectValue placeholder="Select state machine…" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {rive.availableStateMachines.map((sm) => (
                    <SelectItem key={sm} value={sm} className="text-xs">{sm}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-muted-foreground italic">Loading…</span>
          )}
        </div>
      )}

      {/* Main view */}
      <div className="relative flex-1 min-h-0">
        {hasFile ? <RiveViewer /> : <UploadZone onFile={handleFile} />}
        <div className="absolute bottom-4 left-4 w-56">
          <p className="mb-1 text-xs text-muted-foreground">Webcam (Face Tracker)</p>
          <WebcamWithOverlay />
        </div>
      </div>

      {/* Footer — only when a file is loaded */}
      {hasFile && (
        <div className="flex items-center justify-between border-t px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Emotion State</span>
            <Badge>{faceEmotion.charAt(0).toUpperCase() + faceEmotion.slice(1)}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Look At (x, y)</span>
            <span className="font-mono text-xs">{lookAt.x.toFixed(3)}, {lookAt.y.toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
