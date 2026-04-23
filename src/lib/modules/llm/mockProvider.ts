import type { RealtimeLLMProvider, RealtimeConfig, SessionStatus, ToolCall } from './llm.interface'
import { logger } from '@/lib/observability/logger'
import { useTelemetry } from '@/lib/observability/telemetryStore'

const EMOTIONS = ['happy', 'sad', 'surprised', 'angry', 'neutral']

export class MockLLMProvider implements RealtimeLLMProvider {
  private stateHandlers: Array<(s: SessionStatus) => void> = []
  private toolCallHandlers: Array<(c: ToolCall) => void> = []
  private transcriptHandlers: Array<(d: string, r: 'user' | 'assistant') => void> = []
  private intervalId: ReturnType<typeof setInterval> | null = null
  private emotionIdx = 0

  async connect(_cfg: RealtimeConfig): Promise<void> {
    logger.log('llm', '[Mock] Session started')
    useTelemetry.getState().updateLLM({ status: 'connected' })
    this.stateHandlers.forEach((h) => h('connected'))
    this.intervalId = setInterval(() => {
      const emotion = EMOTIONS[this.emotionIdx % EMOTIONS.length]
      this.emotionIdx++
      const call: ToolCall = { name: 'setEmotion', args: { emotion }, id: `mock-${Date.now()}` }
      logger.log('llm', `[Mock] Tool call: setEmotion(${emotion})`)
      useTelemetry.getState().updateLLM({ lastToolCall: `setEmotion(${emotion})` })
      this.toolCallHandlers.forEach((h) => h(call))
      this.transcriptHandlers.forEach((h) => h(`[Mock] Feeling ${emotion}`, 'assistant'))
    }, 4000)
  }

  disconnect(): void {
    if (this.intervalId) clearInterval(this.intervalId)
    this.stateHandlers.forEach((h) => h('idle'))
    useTelemetry.getState().updateLLM({ status: 'idle' })
    logger.log('llm', '[Mock] Session stopped')
  }

  sendMicTrack(_track: MediaStreamTrack): void {}
  respondToolCall(_id: string, _result: unknown): void {}
  onAudio(_cb: (s: MediaStream) => void): void {}
  onTranscript(cb: (d: string, r: 'user' | 'assistant') => void) { this.transcriptHandlers.push(cb) }
  onToolCall(cb: (c: ToolCall) => void) { this.toolCallHandlers.push(cb) }
  onStateChange(cb: (s: SessionStatus) => void) { this.stateHandlers.push(cb) }
}
