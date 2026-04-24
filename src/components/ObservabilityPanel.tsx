import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { logger, type LogEntry } from '@/lib/observability/logger'
import { useTelemetry } from '@/lib/observability/telemetryStore'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'
import { cn } from '@/lib/utils'

function LogLine({ entry }: { entry: LogEntry }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] py-1.5 font-extralight">
      <span className="text-grey-800 shrink-0">{entry.ts}</span>
      <span className={cn(
        'min-w-0 flex-1',
        entry.level === 'error' ? 'text-destructive' : entry.level === 'warn' ? 'text-yellow-500' : 'text-gray-500',
      )}>
        {entry.message}
      </span>
      {entry.repeatCount > 1 && (
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          ×{entry.repeatCount}
        </span>
      )}
    </div>
  )
}

function TelemetryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{String(value)}</span>
    </div>
  )
}

export function ObservabilityPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const telemetry = useTelemetry()
  const { selectedLayer, session } = useEditorStore()

  useEffect(() => {
    setLogs(logger.getEntries())
    return logger.subscribe(setLogs)
  }, [])

  const sourceLabel = selectedLayer === 'rive' ? 'Rive' : selectedLayer === 'llm' ? `LLM (${session.provider === 'mock' ? 'Mock' : 'GPT Realtime'})` : 'Face Tracker'

  return (
    <Card className="flex flex-col h-full rounded-none border-0 border-t">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xs font-semibold text-foreground">
              Observability
            </CardTitle>
            <span className="text-xs text-muted-foreground">{sourceLabel}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <Tabs defaultValue="logs" className="flex flex-col h-full">
          <div className="px-4 pb-6">
            <TabsList className="h-7 w-full">
              <TabsTrigger value="logs" className="flex-1 text-xs">Logs</TabsTrigger>
              <TabsTrigger value="telemetry" className="flex-1 text-xs">Telemetry</TabsTrigger>
              <TabsTrigger value="config" className="flex-1 text-xs">Config</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="logs" className="flex-1 mt-2 min-h-0">
            <ScrollArea className="h-full px-4">
              <div className="flex flex-col">
                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No logs yet.</p>
                ) : (
                  [...logs].reverse().map((e) => <LogLine key={e.id} entry={e} />)
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="telemetry" className="flex-1 mt-2 min-h-0 px-4">
            {selectedLayer === 'face' && (
              <>
                <TelemetryRow label="Nose X" value={telemetry.face.nose.x.toFixed(3)} />
                <TelemetryRow label="Nose Y" value={telemetry.face.nose.y.toFixed(3)} />
                <TelemetryRow label="Emotion" value={telemetry.face.emotion} />
                <TelemetryRow label="Confidence" value={telemetry.face.confidence.toFixed(2)} />
                <TelemetryRow label="FPS" value={telemetry.face.fps} />
              </>
            )}
            {selectedLayer === 'llm' && (
              <>
                <TelemetryRow label="Status" value={telemetry.llm.status} />
                <TelemetryRow label="Last Tool Call" value={telemetry.llm.lastToolCall || '—'} />
                <TelemetryRow label="Latency (ms)" value={telemetry.llm.responseLatencyMs} />
              </>
            )}
            {selectedLayer === 'rive' && (
              <>
                <TelemetryRow label="State Machine" value={telemetry.rive.stateMachine || '—'} />
                <TelemetryRow label="Last Trigger" value={telemetry.rive.lastTrigger || '—'} />
                <TelemetryRow label="Active Inputs" value={telemetry.rive.activeInputs.join(', ') || '—'} />
              </>
            )}
          </TabsContent>

          <TabsContent value="config" className="flex-1 mt-2 min-h-0 px-4">
            <p className="text-xs text-muted-foreground">
              Select a layer to view its config.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
