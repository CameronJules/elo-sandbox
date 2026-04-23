import { create } from 'zustand'

export type LayerKey = 'rive' | 'llm' | 'face'
export type SessionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
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
    stateMachineName: string
    availableStateMachines: string[]
    bindings: {
      emotionInput: string
      lookXInput: string
      lookYInput: string
    }
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
  setAvailableStateMachines(names: string[]): void

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
    src: '/ees.riv',
    stateMachineName: '',
    availableStateMachines: [],
    bindings: {
      emotionInput: '',
      lookXInput: '',
      lookYInput: '',
    },
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
  setAvailableStateMachines: (names) =>
    set((s) => ({
      rive: {
        ...s.rive,
        availableStateMachines: names,
        stateMachineName: s.rive.stateMachineName || names[0] || '',
      },
    })),

  setFaceTrackerField: (key, value) => set((s) => ({ faceTracker: { ...s.faceTracker, [key]: value } })),
}))
