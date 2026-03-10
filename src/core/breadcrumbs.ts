import type { Breadcrumb } from './types'

/**
 * Circular breadcrumb buffer — retains the last N breadcrumbs.
 * Thread-safe for synchronous JavaScript (single-threaded event loop).
 */
export class BreadcrumbBuffer {
  private buffer: Breadcrumb[] = []
  private maxSize: number

  constructor(maxSize = 50) {
    this.maxSize = maxSize
  }

  /** Add a breadcrumb, evicting the oldest if the buffer is full */
  add(breadcrumb: Breadcrumb): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift()
    }
    this.buffer.push(breadcrumb)
  }

  /** Return a shallow copy of all breadcrumbs in chronological order */
  getAll(): Breadcrumb[] {
    return [...this.buffer]
  }

  /** Clear all breadcrumbs */
  clear(): void {
    this.buffer = []
  }

  /**
   * Return breadcrumbs with timestamps relative to an error event.
   * Timestamps are expressed in seconds (negative = before the error, positive = after).
   * One decimal place precision.
   */
  getRelativeTo(errorTime: number): Array<{
    type: string
    timestamp: number
    data: Record<string, string | number | boolean>
  }> {
    return this.buffer.map((b) => ({
      type:      b.type,
      timestamp: Math.round(((b.timestamp - errorTime) / 1000) * 10) / 10,
      data:      b.data,
    }))
  }
}

/**
 * High-resolution timestamp in milliseconds.
 * Uses performance.now() + performance.timeOrigin when available for monotonic accuracy.
 */
export function now(): number {
  if (
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function' &&
    typeof performance.timeOrigin === 'number'
  ) {
    return performance.timeOrigin + performance.now()
  }
  return Date.now()
}
