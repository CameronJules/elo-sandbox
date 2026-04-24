import { useTelemetry } from '@/lib/observability/telemetryStore'

export interface ChopFeedDefinition {
  id: string
  label: string
  sourceModule: string
  getValue(): number | null
}

const FEEDS: ChopFeedDefinition[] = [
  {
    id: 'face.position.x',
    label: 'Face Position X',
    sourceModule: 'face',
    getValue: () => {
      const { nose } = useTelemetry.getState().face
      return (nose.x - 0.5) * 2
    },
  },
  {
    id: 'face.position.y',
    label: 'Face Position Y',
    sourceModule: 'face',
    getValue: () => {
      const { nose } = useTelemetry.getState().face
      return (nose.y - 0.5) * 2
    },
  },
]

export function getChopFeeds(): ChopFeedDefinition[] {
  return FEEDS
}

export function getChopFeedById(id: string): ChopFeedDefinition | undefined {
  return FEEDS.find((feed) => feed.id === id)
}
