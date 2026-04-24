import { useState, useEffect } from 'react'
import { Plus, Zap, Minus, X, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'
import type { RiveVariable, ToolDef } from '@/lib/viewmodels/useEditorStore'
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

function NumberInput({ variable, update }: { variable: RiveVariable; update: (v: number) => void }) {
  const isInt = variable.type === 'integer'
  const [raw, setRaw] = useState(String(variable.value ?? 0))

  // Sync when the store value changes externally
  useEffect(() => {
    setRaw(String(variable.value ?? 0))
  }, [variable.value])

  const commit = (s: string) => {
    const v = isInt ? parseInt(s) : parseFloat(s)
    const safe = isNaN(v) ? 0 : v
    setRaw(String(safe))
    update(safe)
  }

  return (
    <Input
      type="number"
      step="1"
      value={raw}
      className="h-7 w-28 text-xs"
      onChange={(e) => setRaw(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
    />
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
    return <NumberInput variable={variable} update={update} />
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
  const { rive } = useEditorStore()
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

function ToolValueInput({
  variable,
  value,
  onChange,
}: {
  variable: RiveVariable
  value: string | number | boolean | null
  onChange: (v: string | number | boolean) => void
}) {
  if (variable.type === 'enumType') {
    return (
      <Select value={String(value ?? '')} onValueChange={(v) => onChange(v)}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Select value…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {(variable.enumValues ?? []).map((opt) => (
              <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    )
  }
  if (variable.type === 'boolean') {
    return <Switch checked={!!value} onCheckedChange={(v) => onChange(v)} />
  }
  if (variable.type === 'number' || variable.type === 'integer') {
    return (
      <Input
        type="number"
        value={String(value ?? 0)}
        className="h-7 text-xs"
        onChange={(e) => onChange(variable.type === 'integer' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
      />
    )
  }
  return (
    <Input
      value={String(value ?? '')}
      className="h-7 text-xs"
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function ToolEditorContent({
  tool,
  toolIndex,
  onClose,
  onDelete,
}: {
  tool: ToolDef
  toolIndex: number
  onClose: () => void
  onDelete: () => void
}) {
  const { rive, updateTool } = useEditorStore()

  function save(patch: Partial<ToolDef>) {
    updateTool(tool.id, { parameters: { type: 'object', properties: {}, required: [] }, ...patch })
  }

  function handleClose() {
    if (!tool.name.trim()) {
      save({ name: `tool_${toolIndex + 1}` })
    }
    onClose()
  }

  const selectedVariable = rive.variables.find((v) => v.name === tool.variableName) ?? null

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-medium text-muted-foreground">Tool</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3" />
          </Button>
          <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" onClick={handleClose}>
            <X className="size-3" />
          </Button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Name</Label>
          <Input
            value={tool.name}
            onChange={(e) => save({ name: e.target.value })}
            className="h-7 text-xs"
            placeholder="tool_name"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Description</Label>
          <Textarea
            value={tool.description}
            onChange={(e) => save({ description: e.target.value })}
            className="text-xs resize-none min-h-0"
            rows={2}
            placeholder="What this tool does…"
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Action</Label>
          <Select
            value={tool.actionType ?? 'animationControl'}
            onValueChange={(v) => save({ actionType: v as 'animationControl' })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="animationControl" className="text-xs">Animation Control</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Variable</Label>
          {rive.variables.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Load a Rive file first</p>
          ) : (
            <Select
              value={tool.variableName ?? ''}
              onValueChange={(v) => save({ variableName: v, actionValue: null })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select variable…" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {rive.variables
                    .filter((v) => v.type !== 'trigger')
                    .map((v) => (
                      <SelectItem key={v.name} value={v.name} className="text-xs">
                        {v.name}
                        <span className="ml-1 text-muted-foreground">({v.type})</span>
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedVariable && (
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Value</Label>
            <ToolValueInput
              variable={selectedVariable}
              value={tool.actionValue ?? null}
              onChange={(v) => save({ actionValue: v })}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function LLMProperties() {
  const { session, setSessionField, addTool, deleteTool } = useEditorStore()
  const [openToolId, setOpenToolId] = useState<string | null>(null)

  function handleAddTool() {
    const id = `tool_${Date.now()}`
    addTool({
      id,
      name: '',
      description: '',
      parameters: { type: 'object', properties: {}, required: [] },
      actionType: 'animationControl',
      variableName: '',
      actionValue: null,
    })
    setOpenToolId(id)
  }

  function handleClose(tool: ToolDef, index: number) {
    if (!tool.name.trim()) {
      useEditorStore.getState().updateTool(tool.id, { name: `tool_${index + 1}` })
    }
    setOpenToolId(null)
  }

  function handleDelete(id: string) {
    deleteTool(id)
    setOpenToolId(null)
  }

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

      {/* Tools section */}
      <div className="flex flex-col gap-0">
        <div className="flex items-center justify-between py-2">
          <span className="text-xs text-muted-foreground">Tools</span>
          <Button variant="ghost" size="icon" className="size-6" onClick={handleAddTool}>
            <Plus className="size-3.5" />
          </Button>
        </div>
        <Separator />
        {session.tools.map((tool, index) => (
          <div key={tool.id}>
            <Popover
              open={openToolId === tool.id}
              onOpenChange={(o) => {
                if (o) setOpenToolId(tool.id)
                else handleClose(tool, index)
              }}
            >
              <div className="flex items-center">
                <PopoverTrigger asChild>
                  <button className="flex flex-1 items-center gap-2 px-1 py-2.5 text-left hover:bg-accent rounded-sm transition-colors min-w-0">
                    <span className="flex-1 text-xs font-medium truncate">
                      {tool.name || <span className="text-muted-foreground italic">unnamed</span>}
                    </span>
                  </button>
                </PopoverTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); handleDelete(tool.id) }}
                >
                  <Minus className="size-3" />
                </Button>
              </div>
              <PopoverContent
                side="left"
                align="start"
                sideOffset={12}
                className="w-56 p-0 shadow-lg"
              >
                <ToolEditorContent
                  tool={tool}
                  toolIndex={index}
                  onClose={() => handleClose(tool, index)}
                  onDelete={() => handleDelete(tool.id)}
                />
              </PopoverContent>
            </Popover>
            <Separator />
          </div>
        ))}
      </div>

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

      <Row label={`Interrupt Threshold (${session.vadThreshold.toFixed(2)})`}>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[session.vadThreshold]}
          onValueChange={([v]) => setSessionField('vadThreshold', v)}
        />
      </Row>
    </div>
  )
}

export function PropertiesPanel() {
  const { selectedLayer, rive } = useEditorStore()

  const LAYER_META = {
    rive: { label: 'Rive Animation', sub: rive.fileName || 'No file loaded', Icon: Eye },
    llm: { label: 'LLM', sub: 'GPT Realtime', Icon: Bot },
    face: { label: 'Face Tracker Webcam', sub: 'MediaPipe', Icon: Camera },
  }

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
