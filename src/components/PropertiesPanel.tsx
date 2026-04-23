import { Plus, Pencil, ChevronRight, Zap } from 'lucide-react'
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
import type { RiveVariable } from '@/lib/viewmodels/useEditorStore'
import { riveControllerRef } from '@/lib/viewmodels/riveController'
import type { ToolAction } from '@/lib/viewmodels/riveController'
import { logger } from '@/lib/observability/logger'
import { Bot, Eye, Camera } from 'lucide-react'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function VariableControl({ variable }: { variable: RiveVariable }) {
  const { setVariableValue } = useEditorStore()

  const KIND_MAP: Record<string, ToolAction['kind']> = {
    number: 'number', integer: 'number', boolean: 'boolean',
    enumType: 'enum', string: 'string', color: 'color',
  }

  const update = (value: number | boolean | string | null) => {
    logger.log('rive', `UI change: ${variable.name} (${variable.type}) → ${JSON.stringify(value)}`)
    setVariableValue(variable.name, value)
    const kind = KIND_MAP[variable.type]
    if (kind) riveControllerRef.current?.executeAction({ kind, prop: variable.name, value: value as number | boolean | string })
  }

  if (variable.type === 'trigger') {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => {
          logger.log('rive', `trigger fired: ${variable.name}`)
          riveControllerRef.current?.executeAction({ kind: 'trigger', prop: variable.name, value: '' })
        }}
      >
        <Zap className="size-3" />
        Fire
      </Button>
    )
  }

  if (variable.type === 'boolean') {
    return (
      <Switch
        checked={!!variable.value}
        onCheckedChange={(v) => update(v)}
      />
    )
  }

  if (variable.type === 'enumType') {
    const options = variable.enumValues ?? []
    return (
      <Select value={String(variable.value ?? '')} onValueChange={(v) => update(v)}>
        <SelectTrigger className="h-7 w-36 text-xs">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.length === 0 ? (
              <SelectItem value="" disabled className="text-xs text-muted-foreground">No options</SelectItem>
            ) : (
              options.map((ev) => (
                <SelectItem key={ev} value={ev} className="text-xs">{ev}</SelectItem>
              ))
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    )
  }

  if (variable.type === 'number' || variable.type === 'integer') {
    return (
      <Input
        type="number"
        step={variable.type === 'integer' ? '1' : '0.01'}
        value={variable.value as number ?? 0}
        className="h-7 w-28 text-xs"
        onChange={(e) => {
          const v = variable.type === 'integer'
            ? parseInt(e.target.value) || 0
            : parseFloat(e.target.value) || 0
          update(v)
        }}
      />
    )
  }

  if (variable.type === 'string') {
    return (
      <Input
        value={String(variable.value ?? '')}
        className="h-7 w-28 text-xs"
        onChange={(e) => update(e.target.value)}
      />
    )
  }

  if (variable.type === 'color') {
    const argb = (variable.value as number) ?? 0
    const r = (argb >> 16) & 0xff
    const g = (argb >> 8) & 0xff
    const b = argb & 0xff
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    return (
      <input
        type="color"
        value={hex}
        className="h-7 w-14 cursor-pointer rounded border border-input bg-background p-0.5"
        onChange={(e) => {
          const c = e.target.value
          const rr = parseInt(c.slice(1, 3), 16)
          const gg = parseInt(c.slice(3, 5), 16)
          const bb = parseInt(c.slice(5, 7), 16)
          const packed = (0xff << 24) | (rr << 16) | (gg << 8) | bb
          update(packed)
        }}
      />
    )
  }

  return null
}

function RiveProperties() {
  const { rive, eyeOffset, setEyeOffset: storeSetEyeOffset } = useEditorStore()
  const { variables } = rive

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Variables</p>
        <span className="text-xs text-muted-foreground">{variables.length} data values</span>
      </div>

      {variables.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          {rive.viewModelName
            ? 'No variables found on this view model.'
            : 'Select a view model to see its variables.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {variables.map((v) => (
            <div key={v.name} className="flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-medium truncate">{v.name}</span>
                <span className="text-[10px] text-muted-foreground">{v.type}</span>
              </div>
              <div className="shrink-0">
                <VariableControl variable={v} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />
      <p className="text-xs font-medium">Eye Offset</p>

      <Row label="Offset X">
        <Input
          type="number"
          step="0.01"
          value={eyeOffset.x}
          onChange={(e) => {
            const v = parseFloat(e.target.value) || 0
            storeSetEyeOffset({ ...eyeOffset, x: v })
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
            storeSetEyeOffset({ ...eyeOffset, y: v })
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
