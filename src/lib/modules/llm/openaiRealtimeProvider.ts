import type { RealtimeLLMProvider, RealtimeConfig, SessionStatus, ToolCall } from './llm.interface'
import { logger } from '@/lib/observability/logger'
import { useTelemetry } from '@/lib/observability/telemetryStore'

export class OpenAIRealtimeProvider implements RealtimeLLMProvider {
  private pc: RTCPeerConnection | null = null
  private dc: RTCDataChannel | null = null
  private audioHandlers: Array<(s: MediaStream) => void> = []
  private transcriptHandlers: Array<(d: string, r: 'user' | 'assistant') => void> = []
  private toolCallHandlers: Array<(c: ToolCall) => void> = []
  private stateHandlers: Array<(s: SessionStatus) => void> = []
  private pendingToolCalls: Map<string, { name: string; argsBuffer: string }> = new Map()
  private connectTs = 0

  private emitState(s: SessionStatus) {
    useTelemetry.getState().updateLLM({ status: s })
    this.stateHandlers.forEach((h) => h(s))
  }

  async connect(cfg: RealtimeConfig): Promise<void> {
    this.emitState('connecting')
    logger.log('llm', 'Fetching ephemeral token')

    const tokenRes = await fetch('/api/realtime-token', { method: 'POST' })
    const tokenData = await tokenRes.json()
    const ephemeralKey = tokenData.client_secret?.value
    if (!ephemeralKey) throw new Error('Failed to get ephemeral token')

    this.connectTs = Date.now()
    this.pc = new RTCPeerConnection()

    // Remote audio → AudioElement
    const remoteStream = new MediaStream()
    this.pc.ontrack = (e) => {
      e.streams[0].getAudioTracks().forEach((t) => remoteStream.addTrack(t))
      this.audioHandlers.forEach((h) => h(remoteStream))
    }

    // Data channel for events
    this.dc = this.pc.createDataChannel('oai-events')
    this.dc.onopen = () => {
      logger.log('llm', 'Data channel open — sending session config')
      this.dc!.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: cfg.systemPrompt,
            voice: cfg.voice,
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: cfg.interruptions ? { type: 'server_vad' } : null,
            tools: cfg.tools.map((t) => ({ type: 'function', ...t })),
            max_response_output_tokens: cfg.maxResponseTokens,
          },
        }),
      )
      const latency = Date.now() - this.connectTs
      useTelemetry.getState().updateLLM({ responseLatencyMs: latency })
      this.emitState('connected')
      logger.log('llm', `Connected to OpenAI Realtime (${latency}ms)`)
    }
    this.dc.onmessage = (e) => this.handleEvent(JSON.parse(e.data))

    // Create SDP offer
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)

    const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${cfg.model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    })
    const answerSdp = await sdpRes.text()
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
  }

  private handleEvent(event: Record<string, unknown>) {
    const type = event.type as string
    if (type === 'response.audio_transcript.delta') {
      this.transcriptHandlers.forEach((h) => h(event.delta as string, 'assistant'))
    } else if (type === 'conversation.item.input_audio_transcription.completed') {
      this.transcriptHandlers.forEach((h) => h(event.transcript as string, 'user'))
    } else if (type === 'response.function_call_arguments.delta') {
      const id = event.call_id as string
      if (!this.pendingToolCalls.has(id)) {
        this.pendingToolCalls.set(id, { name: event.name as string, argsBuffer: '' })
      }
      this.pendingToolCalls.get(id)!.argsBuffer += event.delta as string
    } else if (type === 'response.function_call_arguments.done') {
      const id = event.call_id as string
      const pending = this.pendingToolCalls.get(id)
      if (pending) {
        const args = JSON.parse(pending.argsBuffer || '{}')
        const call: ToolCall = { name: pending.name, args, id }
        logger.log('llm', `Tool call: ${pending.name}(${JSON.stringify(args)})`)
        useTelemetry.getState().updateLLM({ lastToolCall: `${pending.name}(${JSON.stringify(args)})` })
        this.toolCallHandlers.forEach((h) => h(call))
        this.pendingToolCalls.delete(id)
      }
    } else if (type === 'error') {
      logger.error('llm', 'Realtime error', event.error)
      this.emitState('error')
    }
  }

  sendMicTrack(track: MediaStreamTrack): void {
    if (this.pc) this.pc.addTrack(track)
  }

  respondToolCall(id: string, result: unknown): void {
    this.dc?.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: id,
          output: JSON.stringify(result),
        },
      }),
    )
    this.dc?.send(JSON.stringify({ type: 'response.create' }))
  }

  disconnect(): void {
    this.dc?.close()
    this.pc?.close()
    this.pc = null
    this.dc = null
    this.emitState('idle')
    logger.log('llm', 'Disconnected')
  }

  onAudio(cb: (s: MediaStream) => void) { this.audioHandlers.push(cb) }
  onTranscript(cb: (d: string, r: 'user' | 'assistant') => void) { this.transcriptHandlers.push(cb) }
  onToolCall(cb: (c: ToolCall) => void) { this.toolCallHandlers.push(cb) }
  onStateChange(cb: (s: SessionStatus) => void) { this.stateHandlers.push(cb) }
}
