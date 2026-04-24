import { loadEditorConfig, saveEditorConfig } from '@/lib/services/riveFileStorage'
import { useEditorStore, type ChopDef, type ToolDef } from '@/lib/viewmodels/useEditorStore'

export interface EditorConfig {
  rive: {
    src: string
    stateMachineName: string
    eyeOffset: { x: number; y: number }
  }
  llm: {
    provider: string
    voice: string
    systemPrompt: string
    tools: ToolDef[]
    interruptions: boolean
    vadThreshold?: number
    maxTokens?: number
  }
  faceTracker: {
    overlay: boolean
    smoothing: number
    sensitivity: number
  }
  chops?: Array<Pick<ChopDef, 'id' | 'name' | 'enabled' | 'selectedFeedId' | 'transformCode' | 'targetVariableName'>>
}

const STORAGE_KEY = 'elo-editor-config'

function buildConfig() {
  const s = useEditorStore.getState()
  return {
    rive: { src: s.rive.src, stateMachineName: s.rive.stateMachineName, eyeOffset: s.eyeOffset },
    llm: {
      provider: s.session.provider,
      voice: s.session.voice,
      systemPrompt: s.session.systemPrompt,
      tools: s.session.tools,
      interruptions: s.session.interruptions,
      vadThreshold: s.session.vadThreshold,
    },
    faceTracker: {
      overlay: s.faceTracker.overlay,
      smoothing: s.faceTracker.smoothing,
      sensitivity: s.faceTracker.sensitivity,
    },
    chops: s.chops.map(({ id, name, enabled, selectedFeedId, transformCode, targetVariableName }) => ({
      id,
      name,
      enabled,
      selectedFeedId,
      transformCode,
      targetVariableName,
    })),
  } satisfies EditorConfig
}

function normalizeTools(tools: unknown): ToolDef[] {
  if (!Array.isArray(tools)) return []

  return tools.map((tool, index) => {
    const candidate = tool as Partial<ToolDef> | null | undefined
    return {
      id: typeof candidate?.id === 'string' && candidate.id.trim() ? candidate.id : `tool-${Date.now()}-${index}`,
      name: typeof candidate?.name === 'string' ? candidate.name : '',
      description: typeof candidate?.description === 'string' ? candidate.description : '',
      parameters: typeof candidate?.parameters === 'object' && candidate.parameters != null
        ? candidate.parameters as Record<string, unknown>
        : { type: 'object', properties: {}, required: [] },
      actionType: candidate?.actionType === 'animationControl' ? candidate.actionType : undefined,
      variableName: typeof candidate?.variableName === 'string' ? candidate.variableName : undefined,
      actionValue: candidate?.actionValue ?? null,
    }
  })
}

function applyConfig(cfg: EditorConfig) {
  const s = useEditorStore.getState()
  if (cfg.rive.src && !cfg.rive.src.startsWith('blob:')) {
    s.setRiveField('src', cfg.rive.src)
  }
  s.setRiveField('stateMachineName', cfg.rive.stateMachineName)
  s.setEyeOffset(cfg.rive.eyeOffset)
  s.setSessionField('provider', cfg.llm.provider as 'openai' | 'mock')
  s.setSessionField('voice', cfg.llm.voice)
  s.setSessionField('systemPrompt', cfg.llm.systemPrompt)
  s.setSessionField('tools', normalizeTools(cfg.llm.tools))
  s.setSessionField('interruptions', cfg.llm.interruptions)
  s.setSessionField('vadThreshold', cfg.llm.vadThreshold ?? 0.7)
  s.setFaceTrackerField('overlay', cfg.faceTracker.overlay)
  s.setFaceTrackerField('smoothing', cfg.faceTracker.smoothing)
  s.setFaceTrackerField('sensitivity', cfg.faceTracker.sensitivity)
  const chops = (cfg.chops ?? []).map((chop, index) => ({
    id: chop.id || `chop-${Date.now()}-${index}`,
    name: chop.name || `CHOP ${index + 1}`,
    enabled: chop.enabled ?? false,
    selectedFeedId: chop.selectedFeedId || 'face.position.x',
    transformCode: chop.transformCode || 'return value',
    targetVariableName: chop.targetVariableName || '',
    lastInput: null,
    lastOutput: null,
    error: '',
  }))
  useEditorStore.setState({ chops })
}

export const configSerializer = {
  save(): void {
    const cfg = buildConfig()
    const raw = JSON.stringify(cfg)
    localStorage.setItem(STORAGE_KEY, raw)
    void saveEditorConfig(raw)
  },

  async load(): Promise<void> {
    const raw = await loadEditorConfig().catch(() => null) ?? localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const cfg: EditorConfig = JSON.parse(raw)
    applyConfig(cfg)
  },

  exportJSON(): void {
    const cfg = buildConfig()
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'elo-editor-config.json'
    a.click()
    URL.revokeObjectURL(url)
  },

  loadFromJSON(json: string): void {
    const cfg: EditorConfig = JSON.parse(json)
    applyConfig(cfg)
    const raw = JSON.stringify(buildConfig())
    localStorage.setItem(STORAGE_KEY, raw)
    void saveEditorConfig(raw)
  },
}
