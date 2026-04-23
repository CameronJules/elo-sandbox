import type { AnimationController, RiveInputBindings, Emotion } from './animationController.interface'
import type { ToolCall } from '@/lib/modules/llm/llm.interface'
import { useEditorStore } from './useEditorStore'
import { logger } from '@/lib/observability/logger'
import { useTelemetry } from '@/lib/observability/telemetryStore'

class AnimationControllerImpl implements AnimationController {
  private bindings: RiveInputBindings = {}
  private listeners = new Set<() => void>()

  bindRive(inputs: RiveInputBindings): void {
    this.bindings = inputs
    logger.log('rive', 'Rive inputs bound')
    const activeInputs = Object.entries(inputs)
      .filter(([, v]) => v)
      .map(([k]) => k)
    useTelemetry.getState().updateRive({ activeInputs })
  }

  setEmotion(e: Emotion): void {
    useEditorStore.getState().setEmotion(e)
    const input = this.bindings.emotion
    if (input) {
      try {
        input.value = e as unknown as number
      } catch {
        // no-op; input type may not support direct assignment
      }
    }
    logger.log('rive', `Emotion → ${e}`)
    useTelemetry.getState().updateRive({ lastTrigger: `setEmotion(${e})` })
    this.listeners.forEach((cb) => cb())
  }

  getEmotion(): Emotion {
    return useEditorStore.getState().emotion
  }

  setLookAt(x: number, y: number): void {
    const { eyeOffset } = useEditorStore.getState()
    const ox = Math.max(0, Math.min(1, x + eyeOffset.x))
    const oy = Math.max(0, Math.min(1, y + eyeOffset.y))
    useEditorStore.getState().setLookAt(ox, oy)
    if (this.bindings.lookX) this.bindings.lookX.value = ox
    if (this.bindings.lookY) this.bindings.lookY.value = oy
  }

  setEyeOffset(offset: { x: number; y: number }): void {
    useEditorStore.getState().setEyeOffset(offset)
  }

  handleToolCall(call: ToolCall): void {
    if (call.name === 'setEmotion') {
      const args = call.args as { emotion: string }
      this.setEmotion(args.emotion)
    }
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
}

export const animationController: AnimationController = new AnimationControllerImpl()
