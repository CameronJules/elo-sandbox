export type SessionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface RealtimeConfig {
  voice: string
  systemPrompt: string
  tools: ToolDefinition[]
  model: string
  interruptions: boolean
  vadThreshold: number
}

export interface ToolCall {
  name: string
  args: unknown
  id: string
}

export interface RealtimeLLMProvider {
  connect(cfg: RealtimeConfig): Promise<void>
  disconnect(): void
  sendMicTrack(track: MediaStreamTrack): void
  onAudio(cb: (stream: MediaStream) => void): void
  onTranscript(cb: (delta: string, role: 'user' | 'assistant') => void): void
  onToolCall(cb: (call: ToolCall) => void): void
  respondToolCall(id: string, result: unknown): void
  onStateChange(cb: (state: SessionStatus) => void): void
}
