import type { StateMachineInput } from '@rive-app/react-canvas'
import type { ToolCall } from '@/lib/modules/llm/llm.interface'

export type Emotion = string

export interface RiveInputBindings {
  emotion?: StateMachineInput
  lookX?: StateMachineInput
  lookY?: StateMachineInput
}

export interface AnimationController {
  setEmotion(e: Emotion): void
  getEmotion(): Emotion
  setLookAt(x: number, y: number): void
  setEyeOffset(offset: { x: number; y: number }): void
  bindRive(inputs: RiveInputBindings): void
  handleToolCall(call: ToolCall): void
  subscribe(cb: () => void): () => void
}
