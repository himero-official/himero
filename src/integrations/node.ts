import type { HIMERO as HIMEROClass } from '../core/HIMERO'
import { installConsoleInstrumentation } from './console'

type HIMEROStatic = typeof HIMEROClass

let _installed = false

/**
 * Install Node.js process-level error handlers.
 *
 * Installed hooks:
 *  - process.uncaughtException       (fatal synchronous errors)
 *  - process.unhandledRejection      (unhandled promise rejections)
 *  - process.warning                 (Node deprecation/performance warnings as breadcrumbs)
 *
 * IMPORTANT: uncaughtException allows the transport 500ms to flush before
 * the process exits with code 1. This preserves the fatal error in HIMERO
 * while still terminating the process (swallowing uncaughtException silently
 * is dangerous and leads to undefined state).
 *
 * Idempotent — calling multiple times is safe.
 */
export function installNodeIntegration(himero: HIMEROStatic): void {
  // process.on is unavailable in Next.js Edge Runtime and some bundlers
  if (_installed || typeof process === 'undefined' || typeof process.on !== 'function') return
  _installed = true

  process.on('uncaughtException', (error: Error) => {
    himero.captureError(error, { level: 'critical' })

    // Give the transport queue time to flush, then exit
    // (without this the process would exit before the HTTP request completes)
    setTimeout(() => {
      process.exit(1)
    }, 500)
  })

  process.on('unhandledRejection', (reason: unknown) => {
    let error: Error

    if (reason instanceof Error) {
      error = reason
    } else {
      error      = new Error(String(reason ?? 'Unhandled Promise Rejection'))
      error.name = 'UnhandledPromiseRejection'
    }

    himero.captureError(error)
  })

  // process.warning → captureMessage (Node.js deprecation / performance warnings)
  process.on('warning', (warning: Error) => {
    himero.captureMessage(
      `[${warning.name}] ${warning.message}`.slice(0, 300),
      'warning',
    )
  })

  // console.error / console.warn → dashboard entries
  installConsoleInstrumentation(himero)
}
