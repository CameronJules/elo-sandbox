import { useState, useEffect } from 'react'
import { Plus, Zap, Minus, X, Trash2, Play, Square, Bot, Eye, Camera, SlidersHorizontal } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'
import type { RiveVariable, ToolDef } from '@/lib/viewmodels/useEditorStore'
import { riveControllerRef } from '@/lib/viewmodels/riveController'
import type { ToolAction } from '@/lib/viewmodels/riveController'
import { logger } from '@/lib/observability/logger'
import { OpenAIRealtimeProvider } from '@/lib/modules/llm/openaiRealtimeProvider'
import { MockLLMProvider } from '@/lib/modules/llm/mockProvider'
import { microphoneService } from '@/lib/services/microphoneService'
import type { RealtimeLLMProvider } from '@/lib/modules/llm/llm.interface'
import { getChopFeeds } from '@/lib/modules/chop/chopFeedRegistry'

const providerRef = { current: null as RealtimeLLMProvider | null }
const audioRef = { current: null as HTMLAudioElement | null }

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
      className="h-8 w-full !text-xs border border-border/40 bg-muted"
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
        className="h-8 w-full gap-1.5 text-xs border border-border/40 bg-muted"
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
        <SelectTrigger className="h-8 w-full text-xs border border-border/40 bg-muted">
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
        className="h-8 w-full text-xs border border-border/40 bg-muted"
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
        className="h-8 w-full cursor-pointer rounded border border-border/40 bg-muted p-0.5"
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
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">Variables</p>
          <span className="text-xs text-muted-foreground">{variables.length} data values</span>
        </div>
        <Separator />
      </div>

      {variables.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          {rive.viewModelName
            ? 'No variables found on this view model.'
            : 'Select a view model to see its variables.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {variables.map((v) => (
            <div key={v.name} className="flex flex-col gap-1.5">
              <span className="text-xs truncate">
                <span className="text-gray-800">{v.name}</span>
                <span className="text-gray-400 ml-1.5">{v.type}</span>
              </span>
              <VariableControl variable={v} />
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
        <Label className="text-xs">Show Overlay</Label>
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
  const { session, setSessionField, setSessionStatus, addTool, deleteTool } = useEditorStore()
  const [openToolId, setOpenToolId] = useState<string | null>(null)

  const isActive = session.status === 'connected'
  const isConnecting = session.status === 'connecting'
  const canStart = session.status === 'idle'
  const canStop = session.status !== 'idle'

  async function startSession() {
    setSessionStatus('connecting')
    logger.log('system', 'Session starting')
    try {
      const provider = session.provider === 'mock' ? new MockLLMProvider() : new OpenAIRealtimeProvider()
      providerRef.current = provider

      provider.onStateChange((s) => {
        setSessionStatus(s)
        logger.log('llm', `State → ${s}`)
      })
      provider.onAudio((stream) => {
        if (!audioRef.current) audioRef.current = new Audio()
        audioRef.current.srcObject = stream
        audioRef.current.play()
        logger.log('llm', 'Audio response received')
      })
      provider.onToolCall((call) => {
        const { session, rive } = useEditorStore.getState()
        const tool = session.tools.find((t) => t.name === call.name)

        if (tool?.actionType === 'animationControl' && tool.variableName != null) {
          const variable = rive.variables.find((v) => v.name === tool.variableName)
          if (variable) {
            const KIND_MAP: Record<string, 'number' | 'enum' | 'boolean' | 'trigger' | 'string' | 'color'> = {
              number: 'number', integer: 'number', boolean: 'boolean',
              enumType: 'enum', string: 'string', color: 'color',
            }
            const kind = KIND_MAP[variable.type]
            if (kind) {
              riveControllerRef.current?.executeAction({ kind, prop: tool.variableName, value: tool.actionValue ?? '' })
            }
          }
        }

        if (call.name === 'setEmotion') {
          useEditorStore.getState().setEmotion((call.args as { emotion: string }).emotion)
        }
        provider.respondToolCall(call.id, { success: true })
        logger.log('llm', `Tool call: ${call.name}`)
      })
      provider.onTranscript((delta, role) => {
        if (role === 'user') logger.log('llm', 'User audio detected')
      })

      if (session.provider !== 'mock') {
        const micStream = await microphoneService.start()
        const track = micStream.getAudioTracks()[0]
        provider.sendMicTrack(track)
      }

      await provider.connect({
        voice: session.voice,
        systemPrompt: session.systemPrompt,
        tools: session.tools.map(({ name, description, parameters }) => ({ name, description, parameters })),
        model: 'gpt-4o-realtime-preview-2024-12-17',
        interruptions: session.interruptions,
        vadThreshold: session.vadThreshold,
      })
    } catch (err) {
      logger.error('system', 'Session failed', err)
      setSessionStatus('error')
    }
  }

  function stopSession() {
    providerRef.current?.disconnect()
    providerRef.current = null
    microphoneService.stop()
    if (audioRef.current) {
      audioRef.current.srcObject = null
      audioRef.current = null
    }
    setSessionStatus('idle')
    logger.log('system', 'Session stopped')
  }

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
      {/* Session controls */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            disabled={!canStart}
            onClick={startSession}
          >
            <Play className="size-3.5" />
            {isConnecting ? 'Connecting…' : 'Start Session'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canStop}
            onClick={stopSession}
          >
            <Square className="size-3.5" />
          </Button>
        </div>
        {isActive && (
          <Badge variant="secondary" className="self-start gap-1.5 bg-green-500 text-white hover:bg-green-500/80">
            <span className="size-1.5 rounded-full bg-white" />
            Session Active
          </Badge>
        )}
        {session.status === 'error' && (
          <Badge variant="destructive" className="self-start">Error</Badge>
        )}
      </div>

      <Separator />

      <Row label="Provider">
        <Select
          value={session.provider}
          onValueChange={(v) => setSessionField('provider', v as 'openai' | 'mock')}
        >
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="openai" className="text-xs">OpenAI Realtime</SelectItem>
              <SelectItem value="mock" className="text-xs">Mock (offline)</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Row>

      <Row label="Voice">
        <Select value={session.voice} onValueChange={(v) => setSessionField('voice', v)}>
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {['alloy', 'echo', 'shimmer', 'verse', 'ash', 'ballad', 'coral', 'sage'].map((v) => (
                <SelectItem key={v} value={v} className="text-xs">{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
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
          className="text-xs font-light"
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

      <p className="text-xs font-medium">Session Settings</p>

      <div className="flex items-center justify-between">
        <Label className="text-xs font-normal">Auto Start</Label>
        <Switch
          checked={session.autoStart}
          onCheckedChange={(v) => setSessionField('autoStart', v)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-normal">Interruptions</Label>
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

function ChopProperties() {
  const { chop, rive, setChopField } = useEditorStore()
  const feeds = getChopFeeds()
  const numericVariables = rive.variables.filter((variable) => variable.type === 'number' || variable.type === 'integer')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Enable CHOP</Label>
        <Switch
          checked={chop.enabled}
          onCheckedChange={(value) => setChopField('enabled', value)}
        />
      </div>

      <Separator />

      <Row label="Data Feed">
        <Select value={chop.selectedFeedId} onValueChange={(value) => setChopField('selectedFeedId', value)}>
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Select feed…" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {feeds.map((feed) => (
                <SelectItem key={feed.id} value={feed.id} className="text-xs">
                  {feed.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Row>

      <Row label="Transform Code">
        <Textarea
          value={chop.transformCode}
          onChange={(e) => setChopField('transformCode', e.target.value)}
          rows={5}
          spellCheck={false}
          className="min-h-[132px] resize-y border-zinc-800 bg-zinc-950 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-500"
          placeholder="return value * 100"
        />
      </Row>

      <Row label="Output Variable">
        {numericVariables.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Load a Rive file with numeric variables first</p>
        ) : (
          <Select value={chop.targetVariableName} onValueChange={(value) => setChopField('targetVariableName', value)}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Select numeric variable…" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {numericVariables.map((variable) => (
                  <SelectItem key={variable.name} value={variable.name} className="text-xs">
                    {variable.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </Row>

      <Separator />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Current Input</span>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {chop.lastInput == null ? '—' : chop.lastInput.toFixed(3)}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Current Output</span>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {chop.lastOutput == null ? '—' : chop.lastOutput.toFixed(3)}
          </Badge>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Status</span>
          <div className="rounded-md border border-border/40 bg-muted px-3 py-2 text-xs">
            {chop.error || 'Ready'}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PropertiesPanel() {
  const { selectedLayer, rive } = useEditorStore()

  const LAYER_META = {
    rive: { label: 'Rive Animation', sub: rive.fileName || 'No file loaded', Icon: Eye },
    llm: { label: 'LLM', sub: 'GPT Realtime', Icon: Bot },
    face: { label: 'Face Tracker Webcam', sub: 'MediaPipe', Icon: Camera },
    chop: { label: 'CHOP', sub: 'Channel Operator', Icon: SlidersHorizontal },
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
          {selectedLayer === 'chop' && <ChopProperties />}
        </ScrollAreaContent>
      </CardContent>
    </Card>
  )
}

function ScrollAreaContent({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 pb-8">{children}</div>
}
