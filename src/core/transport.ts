import type { IngestPayload } from './types'
import type { HIMEROConfig } from './config'

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 3000, 10000] as const // ms

interface ItemConfig {
  apiKey:   string
  endpoint: string
  debug:    boolean
}

interface QueueItem {
  payload: IngestPayload
  config:  ItemConfig
  retries: number
}

/**
 * Async queue-based HTTP transport with exponential backoff retry.
 *
 * Key characteristics:
 * - Events are queued and sent serially to avoid thundering-herd on retries.
 * - Uses fetch `keepalive: true` so events survive page unload in browsers.
 * - 429 (rate limit) responses are NOT retried — the server's signal is respected.
 * - Failed items are re-queued at the front so they are retried before new events.
 */
class Transport {
  private queue: QueueItem[] = []
  private processing = false

  enqueue(payload: IngestPayload, config: HIMEROConfig): void {
    this.queue.push({
      payload,
      config: {
        apiKey:   config.apiKey,
        endpoint: config.endpoint ?? 'https://himero.app/api/ingest',
        debug:    config.debug ?? false,
      },
      retries: 0,
    })

    // Start the flush loop if it is not already running
    if (!this.processing) {
      // Use void to signal intentional fire-and-forget
      void this.flush()
    }
  }

  private async flush(): Promise<void> {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()!
      await this.sendItem(item)
    }

    this.processing = false
  }

  private async sendItem(item: QueueItem): Promise<void> {
    try {
      const res = await fetch(item.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-himero-key': item.config.apiKey,
        },
        body:      JSON.stringify(item.payload),
        // keepalive ensures the request is sent even if the page is unloading (browser only)
        // React Native's fetch does not support keepalive, so we omit it in RN
        ...(typeof navigator === 'undefined' || navigator.product !== 'ReactNative'
          ? { keepalive: true }
          : {}),
      })

      if (item.config.debug) {
        console.log(
          `[HIMERO] Sent ${item.payload.error_type}: HTTP ${res.status}`,
        )
      }

      // Retry on server errors (5xx), but not on rate-limit (429)
      if (!res.ok && res.status !== 429 && item.retries < MAX_RETRIES) {
        await this.scheduleRetry(item)
      }
    } catch (err) {
      // Network failure (offline, DNS, etc.)
      if (item.config.debug) {
        console.error('[HIMERO] Network error, will retry:', err)
      }
      if (item.retries < MAX_RETRIES) {
        await this.scheduleRetry(item)
      }
    }
  }

  private async scheduleRetry(item: QueueItem): Promise<void> {
    const delay = RETRY_DELAYS[item.retries] ?? 10000
    item.retries++

    await sleep(delay)

    // Re-queue at the front so this item is retried before new events
    this.queue.unshift(item)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Singleton transport instance shared across the SDK */
export const transport = new Transport()
