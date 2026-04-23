import { Plus, Eye, Bot, Camera } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEditorStore, type LayerKey } from '@/lib/viewmodels/useEditorStore'
import { cn } from '@/lib/utils'

export function LayerPanel() {
  const { selectedLayer, setSelectedLayer, rive } = useEditorStore()

  const LAYERS: { key: LayerKey; label: string; sub: string; Icon: React.ElementType }[] = [
    { key: 'rive', label: 'Rive Animation', sub: rive.fileName || 'No file loaded', Icon: Eye },
    { key: 'llm', label: 'LLM', sub: 'GPT Realtime', Icon: Bot },
    { key: 'face', label: 'Face Tracker Webcam', sub: 'MediaPipe', Icon: Camera },
  ]

  return (
    <Card className="flex flex-col h-full rounded-none border-0 border-b">
      <CardHeader className="flex-row items-center justify-between py-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Hierarchy
        </CardTitle>
        <Button variant="ghost" size="icon" className="size-6">
          <Plus />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5 p-2">
        {LAYERS.map(({ key, label, sub, Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedLayer(key)}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
              selectedLayer === key
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent',
            )}
          >
            <Icon className="size-4 shrink-0 opacity-60" />
            <div className="flex flex-col min-w-0">
              <span className="truncate font-medium text-xs">{label}</span>
              <span className={cn('truncate text-xs', selectedLayer === key ? 'opacity-70' : 'text-muted-foreground')}>
                {sub}
              </span>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
