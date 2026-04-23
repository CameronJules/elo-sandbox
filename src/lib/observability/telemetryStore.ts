import { create } from 'zustand'

interface FaceTelemetry {
  nose: { x: number; y: number }
  fps: number
  confidence: number
  emotion: string
}

interface LLMTelemetry {
  status: string
  lastToolCall: string
  responseLatencyMs: number
}

interface RiveTelemetry {
  stateMachine: string
  activeInputs: string[]
  lastTrigger: string
}

interface TelemetryState {
  face: FaceTelemetry
  llm: LLMTelemetry
  rive: RiveTelemetry
  updateFace(partial: Partial<FaceTelemetry>): void
  updateLLM(partial: Partial<LLMTelemetry>): void
  updateRive(partial: Partial<RiveTelemetry>): void
}

export const useTelemetry = create<TelemetryState>((set) => ({
  face: { nose: { x: 0, y: 0 }, fps: 0, confidence: 0, emotion: 'neutral' },
  llm: { status: 'idle', lastToolCall: '', responseLatencyMs: 0 },
  rive: { stateMachine: '', activeInputs: [], lastTrigger: '' },
  updateFace: (partial) => set((s) => ({ face: { ...s.face, ...partial } })),
  updateLLM: (partial) => set((s) => ({ llm: { ...s.llm, ...partial } })),
  updateRive: (partial) => set((s) => ({ rive: { ...s.rive, ...partial } })),
}))
