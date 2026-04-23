import { create } from 'zustand'

export type LayerKey = 'rive' | 'llm' | 'face'
export type SessionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type RiveVariableType = 'number' | 'integer' | 'boolean' | 'string' | 'trigger' | 'color' | 'enumType'

export interface RiveVariable {
  name: string
  type: RiveVariableType
  value: number | boolean | string | null
  enumValues?: string[]
}

interface EditorState {
  selectedLayer: LayerKey
  emotion: string
  lookAt: { x: number; y: number }
  eyeOffset: { x: number; y: number }

  session: {
    status: SessionStatus
    provider: 'openai' | 'mock'
    voice: string
    systemPrompt: string
    tools: ToolDef[]
    maxTokens: number
    interruptions: boolean
    autoStart: boolean
  }

  rive: {
    src: string
    fileName: string
    stateMachineName: string
    availableStateMachines: string[]
    viewModelName: string
    availableViewModels: string[]
    variables: RiveVariable[]
  }

  faceTracker: {
    overlay: boolean
    smoothing: number
    sensitivity: number
    active: boolean
  }

  setSelectedLayer(layer: LayerKey): void
  setEmotion(emotion: string): void
  setLookAt(x: number, y: number): void
  setEyeOffset(offset: { x: number; y: number }): void

  setSessionStatus(status: SessionStatus): void
  setSessionField<K extends keyof EditorState['session']>(key: K, value: EditorState['session'][K]): void

  setRiveField<K extends keyof EditorState['rive']>(key: K, value: EditorState['rive'][K]): void
  resetRive(src: string, fileName: string): void
  clearRive(): void
  setAvailableStateMachines(names: string[]): void
  setAvailableViewModels(names: string[]): void
  setViewModelName(name: string): void
  setVariables(vars: RiveVariable[]): void
  setVariableValue(name: string, value: number | boolean | string | null): void

  setFaceTrackerField<K extends keyof EditorState['faceTracker']>(key: K, value: EditorState['faceTracker'][K]): void
}

const DEFAULT_SYSTEM_PROMPT = `You are a friendly robot companion. You express emotions using your eyes. You can change your emotion using the setEmotion tool.`

export const useEditorStore = create<EditorState>((set) => ({
  selectedLayer: 'llm',
  emotion: 'neutral',
  lookAt: { x: 0.5, y: 0.5 },
  eyeOffset: { x: 0, y: 0 },

  session: {
    status: 'idle',
    provider: 'mock',
    voice: 'alloy',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    tools: [
      {
        name: 'setEmotion',
        description: 'Update the robot eye emotion state',
        parameters: {
          type: 'object',
          properties: {
            emotion: { type: 'string', enum: ['neutral', 'happy', 'sad', 'surprised', 'angry'] },
          },
          required: ['emotion'],
        },
      },
    ],
    maxTokens: 1024,
    interruptions: true,
    autoStart: false,
  },

  rive: {
    src: '',
    fileName: '',
    stateMachineName: '',
    availableStateMachines: [],
    viewModelName: '',
    availableViewModels: [],
    variables: [],
  },

  faceTracker: {
    overlay: true,
    smoothing: 0.5,
    sensitivity: 1.0,
    active: false,
  },

  setSelectedLayer: (layer) => set({ selectedLayer: layer }),
  setEmotion: (emotion) => set({ emotion }),
  setLookAt: (x, y) => set({ lookAt: { x, y } }),
  setEyeOffset: (offset) => set({ eyeOffset: offset }),

  setSessionStatus: (status) => set((s) => ({ session: { ...s.session, status } })),
  setSessionField: (key, value) => set((s) => ({ session: { ...s.session, [key]: value } })),

  setRiveField: (key, value) => set((s) => ({ rive: { ...s.rive, [key]: value } })),
  resetRive: (src, fileName) => set((s) => ({
    rive: { ...s.rive, src, fileName, stateMachineName: '', availableStateMachines: [], viewModelName: '', availableViewModels: [], variables: [] },
  })),
  clearRive: () => set(() => ({
    rive: { src: '', fileName: '', stateMachineName: '', availableStateMachines: [], viewModelName: '', availableViewModels: [], variables: [] },
  })),
  setAvailableStateMachines: (names) =>
    set((s) => ({
      rive: {
        ...s.rive,
        availableStateMachines: names,
        stateMachineName: s.rive.stateMachineName || names[0] || '',
      },
    })),
  setAvailableViewModels: (names) =>
    set((s) => ({
      rive: {
        ...s.rive,
        availableViewModels: names,
        viewModelName: s.rive.viewModelName || names[0] || '',
      },
    })),
  setViewModelName: (name) => set((s) => ({ rive: { ...s.rive, viewModelName: name } })),
  setVariables: (vars) => set((s) => ({ rive: { ...s.rive, variables: vars } })),
  setVariableValue: (name, value) =>
    set((s) => ({
      rive: {
        ...s.rive,
        variables: s.rive.variables.map((v) => (v.name === name ? { ...v, value } : v)),
      },
    })),

  setFaceTrackerField: (key, value) => set((s) => ({ faceTracker: { ...s.faceTracker, [key]: value } })),
}))
