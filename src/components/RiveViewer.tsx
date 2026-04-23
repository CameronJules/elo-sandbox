import { useEffect, useRef, useState } from 'react'
import { useRive } from '@rive-app/react-canvas'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'
import { RiveController, riveControllerRef } from '@/lib/viewmodels/riveController'
import { logger } from '@/lib/observability/logger'
import type { RiveVariable, RiveVariableType } from '@/lib/viewmodels/useEditorStore'

const EXCLUDED_TYPES = new Set(['viewModel', 'list', 'image', 'artboard', 'listIndex', 'none'])

export function RiveViewer() {
  const {
    rive: riveConfig,
    setAvailableStateMachines,
    setAvailableViewModels,
    setVariables,
  } = useEditorStore()
  const smName = riveConfig.stateMachineName
  const viewModelName = riveConfig.viewModelName

  const { rive, RiveComponent } = useRive({
    src: riveConfig.src,
    autoplay: true,
  })

  // onLoad closure always captures rive=null, so we enumerate here instead
  useEffect(() => {
    if (!rive) return

    const machines: string[] = rive.stateMachineNames ?? []
    setAvailableStateMachines(machines)
    logger.log('rive', `State machines: ${machines.join(', ') || 'none'}`)

    const vmNames: string[] = []
    for (let i = 0; i < rive.viewModelCount; i++) {
      const vm = rive.viewModelByIndex(i)
      if (vm) vmNames.push(vm.name)
    }
    setAvailableViewModels(vmNames)
    logger.log('rive', `View models: [${vmNames.join(', ') || 'none'}]`)
  }, [rive])

  // Start/switch the selected state machine so the animation loop runs
  useEffect(() => {
    if (!rive || !smName) return
    rive.stop()
    rive.play(smName)
    logger.log('rive', `Playing state machine "${smName}"`)
  }, [rive, smName])

  // Bind the selected VMI and create the RiveController
  useEffect(() => {
    if (!rive || !viewModelName) return
    const vm = rive.viewModelByName(viewModelName)
    if (!vm) return
    const instance = vm.defaultInstance() ?? vm.instance()
    if (!instance) return

    rive.bindViewModelInstance(instance)
    riveControllerRef.current = new RiveController(instance)
    logger.log('rive', `Bound view model "${viewModelName}"`)

    const vars: RiveVariable[] = instance.properties
      .filter((p) => !EXCLUDED_TYPES.has(p.type))
      .map((p) => {
        const type = p.type as RiveVariableType
        let value: number | boolean | string | null = null
        let enumValues: string[] | undefined
        try {
          if (type === 'number' || type === 'integer') {
            value = instance.number(p.name)?.value ?? 0
          } else if (type === 'boolean') {
            value = instance.boolean(p.name)?.value ?? false
          } else if (type === 'string') {
            value = instance.string(p.name)?.value ?? ''
          } else if (type === 'color') {
            value = instance.color(p.name)?.value ?? 0
          } else if (type === 'enumType') {
            const e = instance.enum(p.name)
            value = e?.value ?? ''
            enumValues = e?.values ?? []
          }
        } catch (err) {
          logger.warn('rive', `Could not read property "${p.name}" (${type})`, err)
        }
        return { name: p.name, type, value, enumValues }
      })

    setVariables(vars)
    logger.log('rive', `Variables: ${vars.map((v) => v.name).join(', ')}`)

    return () => { riveControllerRef.current = null }
  }, [rive, viewModelName])

  // Pan / zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const dragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setScale((s) => Math.min(5, Math.max(0.1, s * factor)))
  }

  function handleMouseDown(e: React.MouseEvent) {
    dragging.current = true
    setIsDragging(true)
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
  }

  function handleMouseUp() {
    dragging.current = false
    setIsDragging(false)
  }

  function resetTransform() {
    setPan({ x: 0, y: 0 })
    setScale(1)
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center bg-muted/30 overflow-hidden select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={resetTransform}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          width: '100%',
          maxWidth: 600,
          aspectRatio: '1 / 1',
          flexShrink: 0,
        }}
      >
        <RiveComponent />
      </div>
    </div>
  )
}
