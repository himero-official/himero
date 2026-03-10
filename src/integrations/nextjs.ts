import type { HIMEROConfig } from '../core/config'

/**
 * Next.js instrumentation integration for HIMERO.
 *
 * Provides two helpers:
 *  1. registerHIMERO() — call inside instrumentation.ts `register()` to initialise
 *     HIMERO for both server (Node.js) and edge runtimes.
 *  2. withHIMERORequestError() — returns an `onRequestError` handler compatible with
 *     Next.js 15+ instrumentation.ts for server-side request error capture.
 */

// ---------------------------------------------------------------------------
// registerHIMERO
// ---------------------------------------------------------------------------

/**
 * Initialise HIMERO inside Next.js instrumentation.
 *
 * Create `instrumentation.ts` in your project root:
 *
 * ```ts
 * // instrumentation.ts
 * import { registerHIMERO } from 'himero/nextjs'
 *
 * export async function register() {
 *   await registerHIMERO({
 *     apiKey:      process.env.HIMERO_API_KEY!,
 *     environment: process.env.NODE_ENV,
 *   })
 * }
 * ```
 *
 * Note: Dynamic import is used to avoid bundling Node.js-specific code into
 * the Edge runtime. Next.js will automatically choose the correct bundle.
 */
export async function registerHIMERO(config: HIMEROConfig): Promise<void> {
  const { HIMERO } = await import('../core/HIMERO')

  HIMERO.init({
    ...config,
    environment: config.environment ?? process.env.NODE_ENV,
    // Prefer the Vercel git commit SHA for release tracking when available
    release:
      config.release ??
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
      process.env.VERCEL_GIT_COMMIT_SHA ??
      undefined,
  })
}

// ---------------------------------------------------------------------------
// withHIMERORequestError
// ---------------------------------------------------------------------------

/**
 * Creates an `onRequestError` handler for Next.js 15+ instrumentation.
 *
 * ```ts
 * // instrumentation.ts
 * import { registerHIMERO, withHIMERORequestError } from 'himero/nextjs'
 *
 * export async function register() {
 *   await registerHIMERO({ apiKey: process.env.HIMERO_API_KEY! })
 * }
 *
 * export const onRequestError = withHIMERORequestError({
 *   apiKey: process.env.HIMERO_API_KEY!,
 * })
 * ```
 */
export function withHIMERORequestError(config: HIMEROConfig) {
  return async function onRequestError(
    error: { digest: string } & Error,
    request: {
      path: string
      method: string
      headers: Record<string, string>
    },
    context: {
      routerKind: string
      routePath: string
      routeType: string
    },
  ): Promise<void> {
    const { HIMERO } = await import('../core/HIMERO')

    // Lazy init — in case onRequestError fires before register()
    if (!HIMERO.isInitialized) HIMERO.init(config)

    // Scrub sensitive headers before attaching to the error report
    const safeHeaders = scrubHeaders(request.headers)

    HIMERO.captureError(error, {
      level: 'critical',
      extra: {
        digest: error.digest,
        routePath: context.routePath,
        routeType: context.routeType,
      },
      requestContext: {
        method: request.method,
        url: request.path,
        headers: safeHeaders,
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-api-key',
  'x-himero-key',
])

function scrubHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) continue
    out[key] = Array.isArray(value) ? value.join(', ') : (value ?? '')
  }
  return out
}
