import { useEditorStore } from '@/lib/viewmodels/useEditorStore'

interface EditorConfig {
  rive: {
    src: string
    stateMachineName: string
    eyeOffset: { x: number; y: number }
  }
  llm: {
    provider: string
    voice: string
    systemPrompt: string
    tools: unknown[]
    interruptions: boolean
    vadThreshold?: number
    maxTokens?: number
  }
  faceTracker: {
    overlay: boolean
    smoothing: number
    sensitivity: number
  }
}

export const configSerializer = {
  save(): void {
    const s = useEditorStore.getState()
    const cfg: EditorConfig = {
      rive: { src: s.rive.src, stateMachineName: s.rive.stateMachineName, eyeOffset: s.eyeOffset },
      llm: { provider: s.session.provider, voice: s.session.voice, systemPrompt: s.session.systemPrompt, tools: s.session.tools, interruptions: s.session.interruptions, vadThreshold: s.session.vadThreshold },
      faceTracker: { overlay: s.faceTracker.overlay, smoothing: s.faceTracker.smoothing, sensitivity: s.faceTracker.sensitivity },
    }
    localStorage.setItem('elo-editor-config', JSON.stringify(cfg))
  },

  load(): void {
    const raw = localStorage.getItem('elo-editor-config')
    if (!raw) return
    const cfg: EditorConfig = JSON.parse(raw)
    const s = useEditorStore.getState()
    s.setRiveField('src', cfg.rive.src)
    s.setRiveField('stateMachineName', cfg.rive.stateMachineName)
    s.setEyeOffset(cfg.rive.eyeOffset)
    s.setSessionField('provider', cfg.llm.provider as 'openai' | 'mock')
    s.setSessionField('voice', cfg.llm.voice)
    s.setSessionField('systemPrompt', cfg.llm.systemPrompt)
    s.setSessionField('interruptions', cfg.llm.interruptions)
    s.setSessionField('vadThreshold', cfg.llm.vadThreshold ?? 0.7)
    s.setFaceTrackerField('overlay', cfg.faceTracker.overlay)
    s.setFaceTrackerField('smoothing', cfg.faceTracker.smoothing)
    s.setFaceTrackerField('sensitivity', cfg.faceTracker.sensitivity)
  },

  exportJSON(): void {
    const s = useEditorStore.getState()
    const cfg: EditorConfig = {
      rive: { src: s.rive.src, stateMachineName: s.rive.stateMachineName, eyeOffset: s.eyeOffset },
      llm: { provider: s.session.provider, voice: s.session.voice, systemPrompt: s.session.systemPrompt, tools: s.session.tools, interruptions: s.session.interruptions, vadThreshold: s.session.vadThreshold },
      faceTracker: { overlay: s.faceTracker.overlay, smoothing: s.faceTracker.smoothing, sensitivity: s.faceTracker.sensitivity },
    }
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
    const s = useEditorStore.getState()
    s.setRiveField('src', cfg.rive.src)
    s.setRiveField('stateMachineName', cfg.rive.stateMachineName)
    s.setEyeOffset(cfg.rive.eyeOffset)
    s.setSessionField('provider', cfg.llm.provider as 'openai' | 'mock')
    s.setSessionField('voice', cfg.llm.voice)
    s.setSessionField('systemPrompt', cfg.llm.systemPrompt)
    s.setSessionField('interruptions', cfg.llm.interruptions)
    s.setSessionField('vadThreshold', cfg.llm.vadThreshold ?? 0.7)
    s.setFaceTrackerField('overlay', cfg.faceTracker.overlay)
    s.setFaceTrackerField('smoothing', cfg.faceTracker.smoothing)
    s.setFaceTrackerField('sensitivity', cfg.faceTracker.sensitivity)
  },
}
