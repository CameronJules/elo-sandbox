import type { ViewModelInstance } from '@rive-app/react-canvas'
import { logger } from '@/lib/observability/logger'

export type RiveInputMap = {
  number?: Record<string, string>
  enum?: Record<string, string>
  boolean?: Record<string, string>
  trigger?: Record<string, string>
  string?: Record<string, string>
  color?: Record<string, string>
}

export interface ToolAction {
  kind: 'number' | 'enum' | 'boolean' | 'trigger' | 'string' | 'color'
  prop: string
  value: string | number | boolean
}

export class RiveController {
  constructor(private vmi: ViewModelInstance, private map: RiveInputMap = {}) {}

  setNumber(name: string, value: number): void {
    const prop = this.map.number?.[name] ?? name
    try {
      const p = this.vmi.number(prop)
      if (p) { p.value = value; logger.log('rive', `number "${prop}" = ${value}`) }
      else logger.warn('rive', `number prop "${prop}" not found on VMI`)
    } catch (err) { logger.error('rive', `setNumber error "${prop}"`, err) }
  }

  setEnum(name: string, value: string): void {
    const prop = this.map.enum?.[name] ?? name
    try {
      const p = this.vmi.enum(prop)
      if (p) { p.value = value; logger.log('rive', `enum "${prop}" = "${value}"`) }
      else logger.warn('rive', `enum prop "${prop}" not found on VMI`)
    } catch (err) { logger.error('rive', `setEnum error "${prop}"`, err) }
  }

  setBoolean(name: string, value: boolean): void {
    const prop = this.map.boolean?.[name] ?? name
    try {
      const p = this.vmi.boolean(prop)
      if (p) { p.value = value; logger.log('rive', `boolean "${prop}" = ${value}`) }
      else logger.warn('rive', `boolean prop "${prop}" not found on VMI`)
    } catch (err) { logger.error('rive', `setBoolean error "${prop}"`, err) }
  }

  setString(name: string, value: string): void {
    const prop = this.map.string?.[name] ?? name
    try {
      const p = this.vmi.string(prop)
      if (p) { p.value = value; logger.log('rive', `string "${prop}" = "${value}"`) }
      else logger.warn('rive', `string prop "${prop}" not found on VMI`)
    } catch (err) { logger.error('rive', `setString error "${prop}"`, err) }
  }

  setColor(name: string, value: number): void {
    const prop = this.map.color?.[name] ?? name
    try {
      const p = this.vmi.color(prop)
      if (p) { p.value = value; logger.log('rive', `color "${prop}" written`) }
      else logger.warn('rive', `color prop "${prop}" not found on VMI`)
    } catch (err) { logger.error('rive', `setColor error "${prop}"`, err) }
  }

  fireTrigger(name: string): void {
    const prop = this.map.trigger?.[name] ?? name
    try {
      const p = this.vmi.trigger(prop)
      if (p) { p.trigger(); logger.log('rive', `trigger "${prop}" fired`) }
      else logger.warn('rive', `trigger prop "${prop}" not found on VMI`)
    } catch (err) { logger.error('rive', `fireTrigger error "${prop}"`, err) }
  }

  has(kind: keyof RiveInputMap, name: string): boolean {
    return !!this.map[kind]?.[name]
  }

  // Direct VMI dispatch — used by AI tools referencing VM property names explicitly
  executeAction(action: ToolAction): void {
    logger.log(
      'rive',
      `executeAction: ${action.kind} "${action.prop}" = ${JSON.stringify(action.value)}`,
      undefined,
      { groupKey: `executeAction:${action.kind}:${action.prop}`, groupWindowMs: 3000 },
    )
    try {
      switch (action.kind) {
        case 'number': { const p = this.vmi.number(action.prop); if (p) p.value = Number(action.value); break }
        case 'enum':   { const p = this.vmi.enum(action.prop);   if (p) p.value = String(action.value); break }
        case 'boolean':{ const p = this.vmi.boolean(action.prop);if (p) p.value = typeof action.value === 'boolean' ? action.value : action.value === 'true'; break }
        case 'trigger':{ const p = this.vmi.trigger(action.prop);if (p) p.trigger(); break }
        case 'string': { const p = this.vmi.string(action.prop); if (p) p.value = String(action.value); break }
        case 'color':  { const p = this.vmi.color(action.prop);  if (p) p.value = Number(action.value); break }
      }
    } catch (err) {
      logger.error('rive', `executeAction error: ${action.kind} "${action.prop}"`, err)
    }
  }

  updateMap(map: RiveInputMap): void {
    this.map = map
  }
}

export const riveControllerRef: { current: RiveController | null } = { current: null }
