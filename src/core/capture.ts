import type { HIMEROConfig } from './config'
import type { BreadcrumbBuffer } from './breadcrumbs'
import type { IngestPayload, CaptureContext, HIMEROUser } from './types'
import { parseStackTrace, getTopFrame, formatStack } from './stacktrace'
import { getSessionId } from './session'
import { transport } from './transport'

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/** Stores { errorHash -> timestamp } for recent errors to prevent duplicate sends */
const recentErrors = new Map<string, number>()

/** Errors seen within this window (ms) with the same hash are dropped */
const DEDUP_WINDOW_MS = 1000

/** Cap map size to avoid unbounded growth in long-running processes */
const MAX_DEDUP_ENTRIES = 200

function buildErrorHash(
  type: string,
  message: string,
  file?: string | null,
): string {
  // Use the first 80 chars of message — enough for a stable fingerprint
  return `${type}|${message.slice(0, 80)}|${file ?? ''}`
}

// ---------------------------------------------------------------------------
// Ignore-rule matching
// ---------------------------------------------------------------------------

function shouldIgnore(
  config: HIMEROConfig,
  errorType: string,
  errorMessage: string,
): boolean {
  // Always drop script errors from cross-origin frames (no useful info)
  if (
    errorMessage === 'Script error.' ||
    errorMessage === 'Script error' ||
    errorMessage === ''
  ) {
    return true
  }

  const { ignoreErrors } = config
  if (!ignoreErrors || ignoreErrors.length === 0) return false

  for (const pattern of ignoreErrors) {
    if (typeof pattern === 'string') {
      if (errorType.includes(pattern) || errorMessage.includes(pattern)) return true
    } else if (pattern instanceof RegExp) {
      if (pattern.test(errorType) || pattern.test(errorMessage)) return true
    }
  }

  return false
}

// ---------------------------------------------------------------------------
// Main capture function
// ---------------------------------------------------------------------------

/**
 * Normalise an error, build an IngestPayload, apply filters, then enqueue for transport.
 *
 * This is the central function for all error capture paths. It is called by:
 *   - HIMERO.captureError (public API)
 *   - Browser integration (window.onerror, unhandledrejection)
 *   - Node integration (uncaughtException, unhandledRejection)
 *   - React ErrorBoundary
 *   - Framework integrations (Next.js, Express, NestJS)
 */
export function captureError(
  error:             Error | unknown,
  context:           CaptureContext | undefined,
  config:            HIMEROConfig,
  breadcrumbBuffer:  BreadcrumbBuffer,
  user:              HIMEROUser | null,
  _extraContext:     Record<string, unknown>,
): void {
  // --- Guards ---
  if (!config.enabled) return

  if (
    config.sampleRate !== undefined &&
    config.sampleRate < 1.0 &&
    Math.random() > config.sampleRate
  ) {
    return
  }

  // --- Normalise to Error ---
  let err: Error
  if (error instanceof Error) {
    err = error
  } else if (typeof error === 'string') {
    err = new Error(error)
    err.name = 'StringError'
  } else {
    err = new Error(String(error))
    err.name = 'UnknownError'
  }

  const errorType    = context?.level === 'critical' ? `[Critical] ${err.name}` : err.name
  const errorMessage = err.message || String(error)

  // --- Ignore rules ---
  if (shouldIgnore(config, errorType, errorMessage)) return

  // --- Deduplication ---
  const errorTime = Date.now()
  const hash      = buildErrorHash(errorType, errorMessage)
  const lastSeen  = recentErrors.get(hash)

  if (lastSeen !== undefined && errorTime - lastSeen < DEDUP_WINDOW_MS) return

  recentErrors.set(hash, errorTime)

  // Evict oldest entry when the map grows too large
  if (recentErrors.size > MAX_DEDUP_ENTRIES) {
    const firstKey = recentErrors.keys().next().value
    if (firstKey !== undefined) recentErrors.delete(firstKey)
  }

  // --- Stack trace parsing ---
  const stack    = formatStack(err)
  const frames   = parseStackTrace(stack)
  const topFrame = getTopFrame(frames)

  // --- Breadcrumbs ---
  const breadcrumbs = breadcrumbBuffer.getRelativeTo(errorTime)

  // --- User ID resolution (priority: context > instance user) ---
  const rawUserId =
    context?.userId ?? context?.user?.id ?? user?.id ?? null

  const userId = rawUserId != null ? String(rawUserId) : null

  // --- URL ---
  // Guard against React Native: window exists but window.location does not
  const url =
    typeof window !== 'undefined' && window.location != null
      ? window.location.href
      : (context?.requestContext?.url ?? null)

  // --- Build payload ---
  let payload: IngestPayload = {
    error_type:    errorType,
    error_message: errorMessage,
    stack_trace:   stack || null,
    source_file:   topFrame?.file ?? null,
    source_line:   topFrame?.line ?? null,
    source_column: topFrame?.column ?? null,
    // Allow callers to pass a pre-extracted snippet via context.extra
    source_snippet:
      (context?.extra as Record<string, unknown> | undefined)?.sourceSnippet as string | null ??
      null,
    url,
    user_agent:
      typeof navigator !== 'undefined' ? navigator.userAgent : null,
    session_id: getSessionId(),
    user_id:    userId,
    git_commit:  config.release ?? null,
    environment: config.environment ?? 'production',
    breadcrumbs,
  }

  // --- beforeSend hook ---
  if (config.beforeSend) {
    const result = config.beforeSend(payload, { originalError: error })
    if (result === null || result === false) return
    payload = result as IngestPayload
  }

  if (config.debug) {
    console.log('[HIMERO] Capturing error:', errorType, errorMessage)
  }

  // --- Enqueue for transport ---
  transport.enqueue(payload, config)
}
