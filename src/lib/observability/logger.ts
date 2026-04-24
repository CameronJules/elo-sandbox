export type LogSource = 'llm' | 'face' | 'rive' | 'system'
export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  id: number
  ts: string
  level: LogLevel
  source: LogSource
  message: string
  data?: unknown
  repeatCount: number
  groupKey?: string
  lastOccurredAt: number
}

export interface LogOptions {
  groupKey?: string
  groupWindowMs?: number
}

export interface Logger {
  log(source: LogSource, message: string, data?: unknown, options?: LogOptions): void
  warn(source: LogSource, message: string, data?: unknown, options?: LogOptions): void
  error(source: LogSource, message: string, data?: unknown, options?: LogOptions): void
  getEntries(): LogEntry[]
  subscribe(cb: (entries: LogEntry[]) => void): () => void
  clear(): void
}

const RING_SIZE = 500
const DEFAULT_GROUP_WINDOW_MS = 3000

class SimpleLogger implements Logger {
  private entries: LogEntry[] = []
  private counter = 0
  private listeners = new Set<(entries: LogEntry[]) => void>()

  private samePayload(a: unknown, b: unknown): boolean {
    if (a === b) return true
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }

  private findGroupedEntryIndex(level: LogLevel, source: LogSource, groupKey: string, now: number, groupWindowMs: number): number {
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index]
      if (
        entry.level === level &&
        entry.source === source &&
        entry.groupKey === groupKey &&
        now - entry.lastOccurredAt <= groupWindowMs
      ) {
        return index
      }
    }

    return -1
  }

  private add(level: LogLevel, source: LogSource, message: string, data?: unknown, options?: LogOptions) {
    const now = Date.now()
    const ts = new Date(now).toLocaleTimeString('en-US', { hour12: false })
    const groupKey = options?.groupKey
    const groupWindowMs = options?.groupWindowMs ?? DEFAULT_GROUP_WINDOW_MS

    if (groupKey) {
      const entryIndex = this.findGroupedEntryIndex(level, source, groupKey, now, groupWindowMs)

      if (entryIndex >= 0) {
        const groupedEntry = this.entries[entryIndex]
        const nextEntry: LogEntry = {
          ...groupedEntry,
          ts,
          message,
          data,
          repeatCount: groupedEntry.repeatCount + 1,
          lastOccurredAt: now,
        }
        this.entries = this.entries.map((entry, index) => index === entryIndex ? nextEntry : entry)
        this.listeners.forEach((cb) => cb(this.entries))
        return
      }
    }

    const lastEntry = this.entries[this.entries.length - 1]
    if (
      lastEntry &&
      lastEntry.level === level &&
      lastEntry.source === source &&
      lastEntry.message === message &&
      this.samePayload(lastEntry.data, data) &&
      now - lastEntry.lastOccurredAt <= DEFAULT_GROUP_WINDOW_MS
    ) {
      const nextEntry: LogEntry = {
        ...lastEntry,
        ts,
        repeatCount: lastEntry.repeatCount + 1,
        lastOccurredAt: now,
      }
      this.entries = [...this.entries.slice(0, -1), nextEntry]
      this.listeners.forEach((cb) => cb(this.entries))
      return
    }

    const entry: LogEntry = {
      id: ++this.counter,
      ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
      level,
      source,
      message,
      data,
      repeatCount: 1,
      groupKey,
      lastOccurredAt: now,
    }
    this.entries = [...this.entries.slice(-(RING_SIZE - 1)), entry]
    this.listeners.forEach((cb) => cb(this.entries))
  }

  log(source: LogSource, message: string, data?: unknown, options?: LogOptions) {
    this.add('info', source, message, data, options)
  }
  warn(source: LogSource, message: string, data?: unknown, options?: LogOptions) {
    this.add('warn', source, message, data, options)
  }
  error(source: LogSource, message: string, data?: unknown, options?: LogOptions) {
    this.add('error', source, message, data, options)
  }

  getEntries() {
    return this.entries
  }

  subscribe(cb: (entries: LogEntry[]) => void) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  clear() {
    this.entries = []
    this.listeners.forEach((cb) => cb(this.entries))
  }
}

export const logger: Logger = new SimpleLogger()
