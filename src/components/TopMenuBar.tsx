import { Save, Upload, Download, Play, Square, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'
import { configSerializer } from '@/lib/config/configSerializer'
import { logger } from '@/lib/observability/logger'
import { OpenAIRealtimeProvider } from '@/lib/modules/llm/openaiRealtimeProvider'
import { MockLLMProvider } from '@/lib/modules/llm/mockProvider'
import { microphoneService } from '@/lib/services/microphoneService'
import { useRef } from 'react'
import type { RealtimeLLMProvider } from '@/lib/modules/llm/llm.interface'
import { buildLLMTools, executeToolCall } from '@/lib/modules/llm/toolRuntime'

const providerRef = { current: null as RealtimeLLMProvider | null }
const audioRef = { current: null as HTMLAudioElement | null }

export function TopMenuBar() {
  const { session, setSessionStatus, setSessionField } = useEditorStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        const result = executeToolCall(call)
        provider.respondToolCall(call.id, result)
        logger.log('llm', `Tool call: ${call.name}`)
      })
      provider.onTranscript((delta, role) => {
        if (role === 'user') logger.log('llm', `User audio detected`)
      })

      if (session.provider !== 'mock') {
        const micStream = await microphoneService.start()
        const track = micStream.getAudioTracks()[0]
        provider.sendMicTrack(track)
      }

      await provider.connect({
        voice: session.voice,
        systemPrompt: session.systemPrompt,
        tools: buildLLMTools(session.tools, useEditorStore.getState().rive.variables),
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

  function handleLoad() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        configSerializer.loadFromJSON(ev.target?.result as string)
        logger.log('system', 'Config loaded from file')
      } catch {
        logger.error('system', 'Failed to parse config file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <header className="flex h-12 items-center gap-3 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Rive Face Tracking Editor</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => { configSerializer.save(); logger.log('system', 'Config saved') }}>
            <Save data-icon="inline-start" />
            Save
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => configSerializer.exportJSON()}>
            <Download data-icon="inline-start" />
            Export JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLoad}>
            <Upload data-icon="inline-start" />
            Load Config
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />

      <div className="flex flex-1 items-center justify-center gap-3">
        <Button
          size="sm"
          disabled={!canStart}
          onClick={startSession}
          className="gap-2"
        >
          <Play data-icon="inline-start" />
          {isConnecting ? 'Connecting…' : 'Start Session'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canStop}
          onClick={stopSession}
        >
          <Square data-icon="inline-start" />
          Stop Session
        </Button>
        {isActive && (
          <Badge variant="secondary" className="gap-1.5 bg-green-500 text-white hover:bg-green-500/80">
            <span className="size-1.5 rounded-full bg-white" />
            Session Active
          </Badge>
        )}
        {session.status === 'error' && (
          <Badge variant="destructive">Error</Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => { configSerializer.save(); logger.log('system', 'Config saved') }}>
          <Save data-icon="inline-start" />
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={() => configSerializer.exportJSON()}>
          <Upload data-icon="inline-start" />
          Export
        </Button>
        <Button variant="ghost" size="icon">
          <MoreHorizontal />
        </Button>
      </div>
    </header>
  )
}
