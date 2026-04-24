import { useEffect, useRef } from 'react'
import { getChopFeedById } from '@/lib/modules/chop/chopFeedRegistry'
import { useTelemetry } from '@/lib/observability/telemetryStore'
import { riveControllerRef } from '@/lib/viewmodels/riveController'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'

type TransformFn = ((value: number) => number) | null

export function ChopRuntime() {
  const enabled = useEditorStore((s) => s.chop.enabled)
  const selectedFeedId = useEditorStore((s) => s.chop.selectedFeedId)
  const transformCode = useEditorStore((s) => s.chop.transformCode)
  const targetVariableName = useEditorStore((s) => s.chop.targetVariableName)
  const faceNose = useTelemetry((s) => s.face.nose)
  const setChopField = useEditorStore((s) => s.setChopField)
  const setVariableValue = useEditorStore((s) => s.setVariableValue)
  const transformRef = useRef<TransformFn>((value) => value)

  useEffect(() => {
    const body = transformCode.trim() || 'return value'

    try {
      const compiled = new Function('value', body) as (value: number) => unknown
      transformRef.current = (value: number) => {
        const result = compiled(value)
        if (typeof result !== 'number' || Number.isNaN(result)) {
          throw new Error('Transform must return a valid number')
        }
        return result
      }
      setChopField('error', '')
    } catch (err) {
      transformRef.current = null
      setChopField('error', err instanceof Error ? err.message : 'Invalid transform')
    }
  }, [transformCode, setChopField])

  useEffect(() => {
    const feed = selectedFeedId ? getChopFeedById(selectedFeedId) : null
    if (!feed) {
      setChopField('lastInput', null)
      setChopField('lastOutput', null)
      return
    }

    const input = feed.getValue()
    if (input == null) {
      setChopField('lastInput', null)
      setChopField('lastOutput', null)
      return
    }

    setChopField('lastInput', input)

    if (!transformRef.current) {
      setChopField('lastOutput', null)
      return
    }

    try {
      setChopField('lastOutput', transformRef.current(input))
      setChopField('error', '')
    } catch (err) {
      setChopField('lastOutput', null)
      setChopField('error', err instanceof Error ? err.message : 'Transform failed')
    }
  }, [selectedFeedId, faceNose.x, faceNose.y, transformCode, setChopField])

  useEffect(() => {
    if (!enabled) return
    if (!selectedFeedId || !targetVariableName) return

    const targetVariable = useEditorStore.getState().rive.variables.find((variable) => variable.name === targetVariableName)
    if (!targetVariable || (targetVariable.type !== 'number' && targetVariable.type !== 'integer')) return

    const feed = getChopFeedById(selectedFeedId)
    if (!feed || !transformRef.current || !riveControllerRef.current) return

    const input = feed.getValue()
    if (input == null) return

    try {
      const previewOutput = transformRef.current(input)
      const emittedValue = targetVariable.type === 'integer' ? Math.trunc(previewOutput) : previewOutput
      setChopField('error', '')
      riveControllerRef.current.executeAction({ kind: 'number', prop: targetVariableName, value: emittedValue })
      setVariableValue(targetVariableName, emittedValue)
    } catch (err) {
      setChopField('error', err instanceof Error ? err.message : 'Transform failed')
    }
  }, [
    enabled,
    selectedFeedId,
    targetVariableName,
    faceNose.x,
    faceNose.y,
    setChopField,
    setVariableValue,
  ])

  return null
}
