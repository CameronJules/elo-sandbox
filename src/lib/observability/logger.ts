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
}

export interface Logger {
  log(source: LogSource, message: string, data?: unknown): void
  warn(source: LogSource, message: string, data?: unknown): void
  error(source: LogSource, message: string, data?: unknown): void
  getEntries(): LogEntry[]
  subscribe(cb: (entries: LogEntry[]) => void): () => void
  clear(): void
}

const RING_SIZE = 500

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

  private add(level: LogLevel, source: LogSource, message: string, data?: unknown) {
    const lastEntry = this.entries[this.entries.length - 1]
    if (
      lastEntry &&
      lastEntry.level === level &&
      lastEntry.source === source &&
      lastEntry.message === message &&
      this.samePayload(lastEntry.data, data)
    ) {
      const nextEntry: LogEntry = {
        ...lastEntry,
        ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
        repeatCount: lastEntry.repeatCount + 1,
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
    }
    this.entries = [...this.entries.slice(-(RING_SIZE - 1)), entry]
    this.listeners.forEach((cb) => cb(this.entries))
  }

  log(source: LogSource, message: string, data?: unknown) {
    this.add('info', source, message, data)
  }
  warn(source: LogSource, message: string, data?: unknown) {
    this.add('warn', source, message, data)
  }
  error(source: LogSource, message: string, data?: unknown) {
    this.add('error', source, message, data)
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
