import type { HIMERO as HIMEROClass } from '../core/HIMERO'

// Use type-only imports so this file has zero runtime dependency on express
type Request = import('express').Request
type Response = import('express').Response
type NextFunction = import('express').NextFunction
type ErrorRequestHandler = import('express').ErrorRequestHandler

type HIMEROStatic = typeof HIMEROClass

// ---------------------------------------------------------------------------
// himeroErrorHandler
// ---------------------------------------------------------------------------

/**
 * Express error-handling middleware (4-argument signature).
 *
 * MUST be added AFTER all routes and other middleware:
 *
 * ```ts
 * import express from 'express'
 * import HIMERO from 'himero/node'
 * import { himeroErrorHandler } from 'himero/express'
 *
 * HIMERO.init({ apiKey: process.env.HIMERO_API_KEY! })
 *
 * const app = express()
 * app.use('/api', myRouter)
 * // ... other middleware ...
 *
 * // HIMERO LAST — after all routes
 * app.use(himeroErrorHandler(HIMERO))
 *
 * app.listen(3000)
 * ```
 */
export function himeroErrorHandler(himero: HIMEROStatic): ErrorRequestHandler {
  return function himeroExpressErrorHandler(
    err: Error,
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void {
    himero.captureError(err, {
      requestContext: {
        method: req.method,
        url: req.originalUrl,
        headers: flattenHeaders(req.headers as Record<string, string | string[] | undefined>),
        params: req.params as Record<string, string>,
        query: flattenQuery(req.query as Record<string, unknown>),
      },
    })

    // Always call next(err) so Express can send the response / call other error handlers
    next(err)
  }
}

// ---------------------------------------------------------------------------
// himeroRequestMiddleware
// ---------------------------------------------------------------------------

/**
 * Optional request-logging middleware that adds incoming HTTP requests as
 * breadcrumbs. Add this BEFORE your route handlers for best coverage.
 *
 * ```ts
 * app.use(himeroRequestMiddleware(HIMERO))
 * app.use('/api', myRouter)
 * ```
 */
export function himeroRequestMiddleware(himero: HIMEROStatic) {
  return function himeroRequest(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const start = Date.now()

    // Record response status code after the response finishes
    res.on('finish', () => {
      himero._addBreadcrumb({
        type: 'fetch',
        timestamp: Date.now(),
        data: {
          method: req.method,
          url: req.originalUrl.slice(0, 200),
          status: res.statusCode,
          duration: Date.now() - start,
        },
      })
    })

    next()
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Headers that must never be included in error reports */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-api-key',
  'x-himero-key',
  'x-auth-token',
])

function flattenHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) continue
    result[key] = Array.isArray(value) ? value.join(', ') : (value ?? '')
  }
  return result
}

function flattenQuery(
  query: Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    result[key] = Array.isArray(value) ? value.join(',') : String(value ?? '')
  }
  return result
}
