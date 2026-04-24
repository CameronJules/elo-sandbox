import { useEffect, useMemo } from 'react'
import { getChopFeedById } from '@/lib/modules/chop/chopFeedRegistry'
import { useTelemetry } from '@/lib/observability/telemetryStore'
import { riveControllerRef } from '@/lib/viewmodels/riveController'
import { useEditorStore, type ChopDef } from '@/lib/viewmodels/useEditorStore'

function compileTransform(code: string): ((value: number) => number) | null {
  const body = code.trim() || 'return value'

  try {
    const compiled = new Function('value', body) as (value: number) => unknown
    return (value: number) => {
      const result = compiled(value)
      if (typeof result !== 'number' || Number.isNaN(result)) {
        throw new Error('Transform must return a valid number')
      }
      return result
    }
  } catch {
    return null
  }
}

function syncChopPreview(chop: ChopDef) {
  const updateChop = useEditorStore.getState().updateChop
  const feed = chop.selectedFeedId ? getChopFeedById(chop.selectedFeedId) : null

  if (!feed) {
    updateChop(chop.id, { lastInput: null, lastOutput: null })
    return
  }

  const input = feed.getValue()
  if (input == null) {
    updateChop(chop.id, { lastInput: null, lastOutput: null })
    return
  }

  const transform = compileTransform(chop.transformCode)
  if (!transform) {
    updateChop(chop.id, { lastInput: input, lastOutput: null, error: 'Invalid transform' })
    return
  }

  try {
    updateChop(chop.id, { lastInput: input, lastOutput: transform(input), error: '' })
  } catch (err) {
    updateChop(chop.id, { lastInput: input, lastOutput: null, error: err instanceof Error ? err.message : 'Transform failed' })
  }
}

function emitChopValue(chop: ChopDef) {
  if (!chop.enabled || !chop.selectedFeedId || !chop.targetVariableName) return

  const { updateChop, setVariableValue, rive } = useEditorStore.getState()
  const targetVariable = rive.variables.find((variable) => variable.name === chop.targetVariableName)
  if (!targetVariable || (targetVariable.type !== 'number' && targetVariable.type !== 'integer')) return

  const feed = getChopFeedById(chop.selectedFeedId)
  if (!feed || !riveControllerRef.current) return

  const transform = compileTransform(chop.transformCode)
  if (!transform) {
    updateChop(chop.id, { error: 'Invalid transform' })
    return
  }

  const input = feed.getValue()
  if (input == null) return

  try {
    const previewOutput = transform(input)
    const emittedValue = targetVariable.type === 'integer' ? Math.trunc(previewOutput) : previewOutput
    updateChop(chop.id, { error: '' })
    riveControllerRef.current.executeAction({ kind: 'number', prop: chop.targetVariableName, value: emittedValue })
    setVariableValue(chop.targetVariableName, emittedValue)
  } catch (err) {
    updateChop(chop.id, { error: err instanceof Error ? err.message : 'Transform failed' })
  }
}

export function ChopRuntime() {
  const chops = useEditorStore((s) => s.chops)
  const faceNose = useTelemetry((s) => s.face.nose)

  const chopSignature = useMemo(
    () => chops.map((chop) => `${chop.id}:${chop.enabled}:${chop.selectedFeedId}:${chop.transformCode}:${chop.targetVariableName}`).join('|'),
    [chops],
  )

  useEffect(() => {
    chops.forEach(syncChopPreview)
    chops.forEach(emitChopValue)
  }, [chopSignature, faceNose.x, faceNose.y, chops])

  return null
}
