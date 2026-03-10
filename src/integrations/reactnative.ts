import type { HIMERO as HIMEROClass } from '../core/HIMERO'
import { installConsoleInstrumentation } from './console'

type HIMEROStatic = typeof HIMEROClass

let _installed = false

/**
 * Install React Native auto-instrumentation:
 *  - ErrorUtils.setGlobalHandler  (unhandled JS errors + fatal crashes)
 *  - console.error                (captured as errors in the dashboard)
 *  - console.warn                 (captured as warnings in the dashboard)
 *
 * Idempotent — calling multiple times is safe.
 */
export function installReactNativeIntegration(himero: HIMEROStatic): void {
  if (_installed) return
  _installed = true

  instrumentErrorUtils(himero)
  installConsoleInstrumentation(himero)
}

// ---------------------------------------------------------------------------
// React Native global error handler (ErrorUtils)
// Catches all unhandled JS errors, including fatal ones that crash the app
// ---------------------------------------------------------------------------

function instrumentErrorUtils(himero: HIMEROStatic): void {
  const g = globalThis as unknown as Record<string, unknown>
  const ErrorUtils = g.ErrorUtils as
    | {
        setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void
        getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | null
      }
    | undefined

  if (typeof ErrorUtils?.setGlobalHandler !== 'function') return

  const prevHandler =
    typeof ErrorUtils.getGlobalHandler === 'function'
      ? ErrorUtils.getGlobalHandler()
      : null

  ErrorUtils.setGlobalHandler((error: Error, isFatal = false) => {
    himero.captureError(error, {
      level: isFatal ? 'critical' : 'warning',
      extra: { isFatal, source: 'ReactNative.ErrorUtils' },
    })

    if (typeof prevHandler === 'function') prevHandler(error, isFatal)
  })
}
