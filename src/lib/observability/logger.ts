export type LogSource = 'llm' | 'face' | 'rive' | 'system'
export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  id: number
  ts: string
  level: LogLevel
  source: LogSource
  message: string
  data?: unknown
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

  private add(level: LogLevel, source: LogSource, message: string, data?: unknown) {
    const entry: LogEntry = {
      id: ++this.counter,
      ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
      level,
      source,
      message,
      data,
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
