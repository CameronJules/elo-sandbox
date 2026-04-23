import { useEffect, useState } from 'react'
import { Filter } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { logger, type LogEntry } from '@/lib/observability/logger'
import { useTelemetry } from '@/lib/observability/telemetryStore'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'
import { cn } from '@/lib/utils'

function LogLine({ entry }: { entry: LogEntry }) {
  return (
    <div className="flex gap-2 font-mono text-xs py-0.5">
      <span className="text-muted-foreground shrink-0">{entry.ts}</span>
      <span className={cn(
        entry.level === 'error' ? 'text-destructive' : entry.level === 'warn' ? 'text-yellow-500' : 'text-foreground',
      )}>
        {entry.message}
      </span>
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
  const statusColor = session.status === 'connected' ? 'bg-green-500' : session.status === 'connecting' ? 'bg-yellow-500' : 'bg-muted-foreground'

  return (
    <Card className="flex flex-col h-full rounded-none border-0 border-t">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Observability
          </CardTitle>
          <Button variant="ghost" size="icon" className="size-6" onClick={() => logger.clear()}>
            <Filter />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className={cn('size-2 rounded-full', statusColor)} />
          <span className="text-xs text-muted-foreground">{sourceLabel}</span>
          {session.status === 'connected' && (
            <Badge variant="outline" className="text-xs py-0 h-4">Connected</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <Tabs defaultValue="logs" className="flex flex-col h-full">
          <div className="px-4">
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
