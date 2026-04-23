import 'dotenv/config'
import express from 'express'
import type { ToolDefinition } from '../src/lib/modules/llm/llm.interface'

const app = express()
app.use(express.json())

async function handleRealtimeToken(req: express.Request, res: express.Response) {
  const body = (req.body ?? {}) as {
    model?: string
    voice?: string
    systemPrompt?: string
    tools?: ToolDefinition[]
    interruptions?: boolean
    vadThreshold?: number
  }
  const { model, voice, systemPrompt, tools, interruptions, vadThreshold } = body

  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: model ?? 'gpt-realtime',
        instructions: systemPrompt,
        tools: (tools ?? []).map((tool) => ({ type: 'function', ...tool })),
        audio: {
          output: {
            voice: voice ?? 'alloy',
          },
          input: {
            transcription: { model: 'whisper-1' },
            turn_detection: interruptions ? { type: 'server_vad', threshold: vadThreshold ?? 0.7 } : null,
          },
        },
      },
    }),
  })

  const data = await response.json()
  res.status(response.status).json(data)
}

app.get('/api/realtime-token', handleRealtimeToken)
app.post('/api/realtime-token', handleRealtimeToken)

app.listen(3001, () => console.log('Token server running on :3001'))
