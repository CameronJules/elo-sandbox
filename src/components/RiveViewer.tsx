import { useEffect } from 'react'
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'
import { animationController } from '@/lib/viewmodels/animationController'
import { logger } from '@/lib/observability/logger'
import { useTelemetry } from '@/lib/observability/telemetryStore'

export function RiveViewer() {
  const { rive: riveConfig, setAvailableStateMachines } = useEditorStore()
  const smName = riveConfig.stateMachineName
  const { bindings } = riveConfig

  const { rive, RiveComponent } = useRive({
    src: riveConfig.src,
    autoplay: true,
    stateMachines: smName || undefined,
    onLoad: () => {
      if (!rive) return
      const machines = rive.stateMachineNames
      setAvailableStateMachines(machines)
      logger.log('rive', `Loaded — state machines: ${machines.join(', ')}`)
      useTelemetry.getState().updateRive({ stateMachine: machines[0] || '' })
    },
  })

  // Look inputs — use the binding names the user configured
  const lookXInput = useStateMachineInput(rive, smName, bindings.lookXInput || '__none__')
  const lookYInput = useStateMachineInput(rive, smName, bindings.lookYInput || '__none__')
  const emotionInput = useStateMachineInput(rive, smName, bindings.emotionInput || '__none__')

  useEffect(() => {
    animationController.bindRive({
      emotion: emotionInput ?? undefined,
      lookX: lookXInput ?? undefined,
      lookY: lookYInput ?? undefined,
    })
  }, [lookXInput, lookYInput, emotionInput])

  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <div className="aspect-square h-full max-h-[600px] max-w-[600px] w-full">
        <RiveComponent />
      </div>
    </div>
  )
}
