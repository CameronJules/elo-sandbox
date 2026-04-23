import { Plus, Pencil, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'
import { animationController } from '@/lib/viewmodels/animationController'
import { Bot, Eye, Camera } from 'lucide-react'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function RiveProperties() {
  const { rive, setRiveField, eyeOffset, setEyeOffset } = useEditorStore()

  return (
    <div className="flex flex-col gap-4">
      <Row label="State Machine">
        <Select
          value={rive.stateMachineName}
          onValueChange={(v) => setRiveField('stateMachineName', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select state machine" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {rive.availableStateMachines.map((sm) => (
                <SelectItem key={sm} value={sm}>{sm}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Row>

      <Separator />
      <p className="text-xs font-medium">Input Bindings</p>

      <Row label="Emotion Input">
        <Input
          value={rive.bindings.emotionInput}
          onChange={(e) => setRiveField('bindings', { ...rive.bindings, emotionInput: e.target.value })}
          placeholder="e.g. emotion"
        />
      </Row>
      <Row label="Look X Input">
        <Input
          value={rive.bindings.lookXInput}
          onChange={(e) => setRiveField('bindings', { ...rive.bindings, lookXInput: e.target.value })}
          placeholder="e.g. lookX"
        />
      </Row>
      <Row label="Look Y Input">
        <Input
          value={rive.bindings.lookYInput}
          onChange={(e) => setRiveField('bindings', { ...rive.bindings, lookYInput: e.target.value })}
          placeholder="e.g. lookY"
        />
      </Row>

      <Separator />
      <p className="text-xs font-medium">Eye Offset</p>

      <Row label="Offset X">
        <Input
          type="number"
          step="0.01"
          value={eyeOffset.x}
          onChange={(e) => {
            const v = parseFloat(e.target.value) || 0
            animationController.setEyeOffset({ ...eyeOffset, x: v })
          }}
        />
      </Row>
      <Row label="Offset Y">
        <Input
          type="number"
          step="0.01"
          value={eyeOffset.y}
          onChange={(e) => {
            const v = parseFloat(e.target.value) || 0
            animationController.setEyeOffset({ ...eyeOffset, y: v })
          }}
        />
      </Row>
    </div>
  )
}

function FaceTrackerProperties() {
  const { faceTracker, setFaceTrackerField } = useEditorStore()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Show Overlay</Label>
        <Switch
          checked={faceTracker.overlay}
          onCheckedChange={(v) => setFaceTrackerField('overlay', v)}
        />
      </div>
      <Separator />
      <Row label={`Smoothing (${faceTracker.smoothing.toFixed(2)})`}>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[faceTracker.smoothing]}
          onValueChange={([v]) => setFaceTrackerField('smoothing', v)}
        />
      </Row>
      <Row label={`Sensitivity (${faceTracker.sensitivity.toFixed(2)})`}>
        <Slider
          min={0.1}
          max={2}
          step={0.05}
          value={[faceTracker.sensitivity]}
          onValueChange={([v]) => setFaceTrackerField('sensitivity', v)}
        />
      </Row>
    </div>
  )
}

function LLMProperties() {
  const { session, setSessionField } = useEditorStore()

  return (
    <div className="flex flex-col gap-4">
      <Row label="Provider">
        <Select
          value={session.provider}
          onValueChange={(v) => setSessionField('provider', v as 'openai' | 'mock')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="openai">OpenAI Realtime</SelectItem>
              <SelectItem value="mock">Mock (offline)</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Row>

      <Row label="Voice">
        <Select value={session.voice} onValueChange={(v) => setSessionField('voice', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {['alloy', 'echo', 'shimmer', 'verse', 'ash', 'ballad', 'coral', 'sage'].map((v) => (
                <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Row>

      <Row label="System Prompt">
        <Textarea
          value={session.systemPrompt}
          onChange={(e) => setSessionField('systemPrompt', e.target.value)}
          rows={5}
          className="text-xs"
        />
      </Row>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-sm">Tools (Available to LLM)</span>
        <Button variant="outline" size="sm" className="gap-1 text-xs h-7">
          <Plus className="size-3" />
          Add Tool
        </Button>
      </div>
      {session.tools.map((tool) => (
        <div key={tool.name} className="flex items-center gap-2 rounded-md border px-3 py-2">
          <ChevronRight className="size-3 text-muted-foreground" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-medium">{tool.name}</span>
            <span className="text-xs text-muted-foreground truncate">{tool.description}</span>
          </div>
          <Button variant="ghost" size="icon" className="size-6">
            <Pencil className="size-3" />
          </Button>
        </div>
      ))}

      <Separator />
      <p className="text-xs font-medium">Session Settings</p>

      <div className="flex items-center justify-between">
        <Label className="text-sm">Auto Start</Label>
        <Switch
          checked={session.autoStart}
          onCheckedChange={(v) => setSessionField('autoStart', v)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">Interruptions</Label>
        <Switch
          checked={session.interruptions}
          onCheckedChange={(v) => setSessionField('interruptions', v)}
        />
      </div>

      <Row label="Max Response Tokens">
        <Input
          type="number"
          value={session.maxTokens}
          onChange={(e) => setSessionField('maxTokens', parseInt(e.target.value) || 1024)}
        />
      </Row>
    </div>
  )
}

const LAYER_META = {
  rive: { label: 'Rive Animation', sub: 'ees.riv', Icon: Eye },
  llm: { label: 'LLM', sub: 'GPT Realtime', Icon: Bot },
  face: { label: 'Face Tracker Webcam', sub: 'MediaPipe', Icon: Camera },
}

export function PropertiesPanel() {
  const { selectedLayer } = useEditorStore()
  const meta = LAYER_META[selectedLayer]
  const { Icon } = meta

  return (
    <Card className="flex flex-col h-full rounded-none border-0 border-l">
      <CardHeader className="py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md border">
            <Icon className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm">{meta.label}</CardTitle>
            <p className="text-xs text-muted-foreground">{meta.sub}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <ScrollAreaContent>
          {selectedLayer === 'rive' && <RiveProperties />}
          {selectedLayer === 'llm' && <LLMProperties />}
          {selectedLayer === 'face' && <FaceTrackerProperties />}
        </ScrollAreaContent>
      </CardContent>
    </Card>
  )
}

function ScrollAreaContent({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 pb-8">{children}</div>
}
