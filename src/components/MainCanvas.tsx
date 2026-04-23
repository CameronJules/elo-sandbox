import { RiveViewer } from './RiveViewer'
import { WebcamWithOverlay } from './WebcamWithOverlay'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'

export function MainCanvas() {
  const { emotion, lookAt, rive, setRiveField } = useEditorStore()

  return (
    <div className="flex flex-col h-full">
      {/* Canvas header */}
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <span className="text-sm font-medium">Rive Animation (Robot Eyes)</span>
      </div>

      {/* State machine selector */}
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <span className="text-xs text-muted-foreground">State Machine</span>
        <Select
          value={rive.stateMachineName}
          onValueChange={(v) => setRiveField('stateMachineName', v)}
        >
          <SelectTrigger className="h-7 w-48 text-xs">
            <SelectValue placeholder="Loading…" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {rive.availableStateMachines.map((sm) => (
                <SelectItem key={sm} value={sm} className="text-xs">{sm}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Main view — Rive + webcam overlay */}
      <div className="relative flex-1 min-h-0">
        <RiveViewer />
        {/* Webcam pinned bottom-left */}
        <div className="absolute bottom-4 left-4 w-56">
          <p className="mb-1 text-xs text-muted-foreground">Webcam (Face Tracker)</p>
          <WebcamWithOverlay />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Emotion State</span>
          <Badge>{emotion.charAt(0).toUpperCase() + emotion.slice(1)}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Look At (x, y)</span>
          <span className="font-mono text-xs">
            {lookAt.x.toFixed(3)}, {lookAt.y.toFixed(3)}
          </span>
        </div>
      </div>
    </div>
  )
}
