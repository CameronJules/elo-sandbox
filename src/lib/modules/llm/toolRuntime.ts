import type { ToolCall, ToolDefinition } from '@/lib/modules/llm/llm.interface'
import type { RiveVariable, ToolDef } from '@/lib/viewmodels/useEditorStore'
import { useEditorStore } from '@/lib/viewmodels/useEditorStore'
import { riveControllerRef } from '@/lib/viewmodels/riveController'

const KIND_MAP: Record<string, 'number' | 'enum' | 'boolean' | 'trigger' | 'string' | 'color'> = {
  number: 'number',
  integer: 'number',
  boolean: 'boolean',
  enumType: 'enum',
  string: 'string',
  color: 'color',
}

function enumToolDescription(tool: ToolDef, variable: RiveVariable): string {
  const values = variable.enumValues ?? []
  const base = tool.description.trim()
    || `Set the ${variable.name} enum to the value that best matches the requested function.`

  return [
    base,
    `Use the value argument to choose exactly one ${variable.name} value.`,
    values.length > 0 ? `Available values: ${values.join(', ')}` : '',
  ].filter(Boolean).join(' ')
}

export function buildLLMTools(tools: ToolDef[], variables: RiveVariable[]): ToolDefinition[] {
  return tools.map((tool) => {
    if (tool.actionType === 'enumValueSelector') {
      const variable = variables.find((entry) => entry.name === tool.variableName && entry.type === 'enumType')
      const enumValues = variable?.enumValues ?? []

      return {
        name: tool.name,
        description: variable ? enumToolDescription(tool, variable) : tool.description,
        parameters: {
          type: 'object',
          properties: {
            value: {
              type: 'string',
              ...(enumValues.length > 0 ? { enum: enumValues } : {}),
              description: variable
                ? `The ${variable.name} enum value to set. Values are named by their function.`
                : 'The enum value to set.',
            },
          },
          required: ['value'],
          additionalProperties: false,
        },
      }
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }
  })
}

function getToolArg(args: unknown, key: string): unknown {
  if (typeof args !== 'object' || args == null) return undefined
  return (args as Record<string, unknown>)[key]
}

export function executeToolCall(call: ToolCall): { success: boolean; error?: string } {
  const { session, rive, setEmotion, setVariableValue } = useEditorStore.getState()
  const tool = session.tools.find((entry) => entry.name === call.name)

  if (tool?.actionType === 'enumValueSelector') {
    const variable = rive.variables.find((entry) => entry.name === tool.variableName && entry.type === 'enumType')
    if (!variable) return { success: false, error: `Enum variable "${tool.variableName ?? ''}" not found` }

    const value = getToolArg(call.args, 'value')
    if (typeof value !== 'string') return { success: false, error: 'Enum tool requires a string value argument' }

    const allowedValues = variable.enumValues ?? []
    if (allowedValues.length > 0 && !allowedValues.includes(value)) {
      return { success: false, error: `"${value}" is not a valid value for ${variable.name}` }
    }

    setVariableValue(variable.name, value)
    riveControllerRef.current?.executeAction({ kind: 'enum', prop: variable.name, value })
    return { success: true }
  }

  if (tool?.actionType === 'animationControl' && tool.variableName != null) {
    const variable = rive.variables.find((entry) => entry.name === tool.variableName)
    if (variable) {
      const kind = KIND_MAP[variable.type]
      if (kind) {
        const value = tool.actionValue ?? ''
        setVariableValue(variable.name, value)
        riveControllerRef.current?.executeAction({ kind, prop: tool.variableName, value })
      }
    }
  }

  if (call.name === 'setEmotion') {
    setEmotion((call.args as { emotion: string }).emotion)
  }

  return { success: true }
}
