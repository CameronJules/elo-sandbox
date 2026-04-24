import { useEffect } from 'react'
import { LayerPanel } from '@/components/LayerPanel'
import { ObservabilityPanel } from '@/components/ObservabilityPanel'
import { MainCanvas } from '@/components/MainCanvas'
import { PropertiesPanel } from '@/components/PropertiesPanel'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { configSerializer, type EditorConfig } from '@/lib/config/configSerializer'
import { loadRiveFile, bufferToBlobUrl } from '@/lib/services/riveFileStorage'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'

function persistedConfigFromState(state: ReturnType<typeof useEditorStore.getState>): EditorConfig {
  return {
    rive: {
      src: state.rive.src,
      stateMachineName: state.rive.stateMachineName,
      eyeOffset: state.eyeOffset,
    },
    llm: {
      provider: state.session.provider,
      voice: state.session.voice,
      systemPrompt: state.session.systemPrompt,
      tools: state.session.tools,
      interruptions: state.session.interruptions,
      vadThreshold: state.session.vadThreshold,
    },
    faceTracker: {
      overlay: state.faceTracker.overlay,
      smoothing: state.faceTracker.smoothing,
      sensitivity: state.faceTracker.sensitivity,
    },
  }
}

export default function Editor() {
  const resetRive = useEditorStore((s) => s.resetRive)

  useEffect(() => {
    let cancelled = false

    void configSerializer.load()
      .then(() => loadRiveFile())
      .then((saved) => {
        if (cancelled || !saved) return
        resetRive(bufferToBlobUrl(saved.buffer), saved.fileName)
      })
      .catch(() => {/* no saved config or file */})

    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      const nextConfig = JSON.stringify(persistedConfigFromState(state))
      const prevConfig = JSON.stringify(persistedConfigFromState(prevState))
      if (nextConfig !== prevConfig) configSerializer.save()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [resetRive])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
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
