import { useEffect } from 'react'
import { TopMenuBar } from '@/components/TopMenuBar'
import { LayerPanel } from '@/components/LayerPanel'
import { ObservabilityPanel } from '@/components/ObservabilityPanel'
import { MainCanvas } from '@/components/MainCanvas'
import { PropertiesPanel } from '@/components/PropertiesPanel'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { loadRiveFile, bufferToBlobUrl } from '@/lib/services/riveFileStorage'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'

export default function Editor() {
  const resetRive = useEditorStore((s) => s.resetRive)

  useEffect(() => {
    loadRiveFile().then((buf) => {
      if (!buf) return
      resetRive(bufferToBlobUrl(buf))
    }).catch(() => {/* no saved file */})
  }, [])
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopMenuBar />
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Left sidebar */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={40} minSize={20}>
              <LayerPanel />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={60} minSize={25}>
              <ObservabilityPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main canvas */}
        <ResizablePanel defaultSize={55} minSize={30}>
          <MainCanvas />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right properties panel */}
        <ResizablePanel defaultSize={25} minSize={18} maxSize={40}>
          <PropertiesPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
