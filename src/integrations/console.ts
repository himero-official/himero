import type { HIMERO as HIMEROClass } from '../core/HIMERO'

type HIMEROStatic = typeof HIMEROClass

/**
 * Shared console instrumentation.
 *
 *  console.error → captureError()         (appears in dashboard error feed)
 *  console.warn  → captureMessage/warning  (appears in dashboard as warning)
 *
 * Used by every platform integration:
 *  browser, node, reactnative
 *
 * Re-entrance guard (_capturing) prevents infinite loops when HIMERO itself
 * calls console.warn (e.g. "Not initialized" warning).
 *
 * Idempotent: returns false if already installed.
 */
export function installConsoleInstrumentation(himero: HIMEROStatic): boolean {
  if (typeof console === 'undefined') return false
  // Mark on the console object so repeated installs are no-ops
  const marker = '__himero_console__'
  if ((console as unknown as Record<string, unknown>)[marker]) return false
  ;(console as unknown as Record<string, unknown>)[marker] = true

  let _capturing = false

  const origError = console.error.bind(console)
  const origWarn  = console.warn.bind(console)

  // ── console.error → captureError ────────────────────────────
  console.error = function (...args: unknown[]) {
    const firstArg = args[0]
    const isInternal =
      typeof firstArg === 'string' && firstArg.startsWith('[HIMERO]')
    if (!_capturing && !isInternal) {
      _capturing = true
      try {
        const err =
          firstArg instanceof Error
            ? firstArg
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
        himero.captureError(err)
      } finally {
        _capturing = false
      }
    }
    return origError(...args)
  }

  // ── console.warn → captureMessage('warning') ─────────────────
  console.warn = function (...args: unknown[]) {
    const firstArg = args[0]
    const isInternal =
      typeof firstArg === 'string' && firstArg.startsWith('[HIMERO]')
    if (!_capturing && !isInternal) {
      _capturing = true
      try {
        const message = args
          .map((a) =>
            typeof a === 'string'
              ? a
              : a instanceof Error
              ? a.message
              : JSON.stringify(a),
          )
          .join(' ')
          .slice(0, 300)
        himero.captureMessage(message, 'warning')
      } finally {
        _capturing = false
      }
    }
    return origWarn(...args)
  }

  return true
}
