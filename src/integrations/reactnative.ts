import type { HIMERO as HIMEROClass } from '../core/HIMERO'

type HIMEROStatic = typeof HIMEROClass

let _himero: HIMEROStatic | null = null
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
  _himero    = himero

  instrumentErrorUtils()
  instrumentConsole()
}

// ---------------------------------------------------------------------------
// React Native global error handler (ErrorUtils)
// Catches all unhandled JS errors, including fatal ones that crash the app
// ---------------------------------------------------------------------------

function instrumentErrorUtils(): void {
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
    _capturing = true
    try {
      _himero?.captureError(error, {
        level: isFatal ? 'critical' : 'warning',
        extra: { isFatal, source: 'ReactNative.ErrorUtils' },
      })
    } finally {
      _capturing = false
    }

    if (typeof prevHandler === 'function') prevHandler(error, isFatal)
  })
}

// ---------------------------------------------------------------------------
// console.error / console.warn instrumentation
// console.error → sent as an error (appears in dashboard error feed)
// console.warn  → sent as a warning (appears in dashboard)
//
// _capturing flag prevents re-entrance (HIMERO itself may call console.warn
// before initialization, etc.)
// ---------------------------------------------------------------------------

let _capturing = false

function instrumentConsole(): void {
  const origError = console.error.bind(console)
  const origWarn  = console.warn.bind(console)

  console.error = function (...args: unknown[]) {
    if (!_capturing) {
      _capturing = true
      try {
        const err =
          args[0] instanceof Error
            ? args[0]
            : (() => {
                const msg = args
                  .map((a) =>
                    typeof a === 'string'
                      ? a
                      : a instanceof Error
                      ? a.message
                      : JSON.stringify(a),
                  )
                  .join(' ')
                  .slice(0, 400)
                const e  = new Error(msg)
                e.name   = 'ConsoleError'
                return e
              })()
        _himero?.captureError(err)
      } finally {
        _capturing = false
      }
    }
    return origError(...args)
  }

  console.warn = function (...args: unknown[]) {
    if (!_capturing) {
      _capturing = true
      try {
        const message = args
          .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
          .join(' ')
          .slice(0, 300)
        _himero?.captureMessage(message, 'warning')
      } finally {
        _capturing = false
      }
    }
    return origWarn(...args)
  }
}
