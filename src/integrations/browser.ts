import type { HIMERO as HIMEROClass } from '../core/HIMERO'

type HIMEROStatic = typeof HIMEROClass

let _himero: HIMEROStatic | null = null
let _installed = false

/**
 * Install all browser auto-instrumentation hooks.
 *
 * Installed hooks:
 *  - window.onerror                    (synchronous errors)
 *  - window unhandledrejection         (unhandled promise rejections)
 *  - fetch (monkey-patch)              (network breadcrumbs)
 *  - XMLHttpRequest (monkey-patch)     (network breadcrumbs)
 *  - console.error / console.warn      (log breadcrumbs)
 *  - history.pushState / replaceState  (navigation breadcrumbs)
 *  - document click listener           (click breadcrumbs)
 *
 * Idempotent — calling multiple times is safe.
 */
export function installBrowserIntegration(himero: HIMEROStatic): void {
  if (_installed || typeof window === 'undefined') return
  _installed = true
  _himero    = himero

  instrumentWindowError()
  instrumentUnhandledRejection()
  instrumentFetch()
  instrumentXHR()
  instrumentConsole()
  instrumentNavigation()
  instrumentClicks()
}

// ---------------------------------------------------------------------------
// window.onerror
// ---------------------------------------------------------------------------

function instrumentWindowError(): void {
  const prev = window.onerror

  window.onerror = function (message, source, lineno, colno, error) {
    if (error) {
      _himero?.captureError(error)
    } else {
      // Synthetic error for message-only events (e.g., cross-origin scripts)
      const syntheticError    = new Error(String(message))
      syntheticError.name     = 'WindowError'
      _himero?.captureError(syntheticError)
    }

    // Call previous handler if one existed
    if (typeof prev === 'function') {
      return prev.call(this, message, source, lineno, colno, error)
    }
    // Return false to allow default browser error reporting
    return false
  }
}

// ---------------------------------------------------------------------------
// unhandledrejection
// ---------------------------------------------------------------------------

function instrumentUnhandledRejection(): void {
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      let error: Error

      if (event.reason instanceof Error) {
        error = event.reason
      } else {
        error      = new Error(String(event.reason ?? 'Unhandled Promise Rejection'))
        error.name = 'UnhandledRejection'
      }

      _himero?.captureError(error)
    },
    { capture: true },
  )
}

// ---------------------------------------------------------------------------
// fetch
// ---------------------------------------------------------------------------

function instrumentFetch(): void {
  if (typeof window.fetch !== 'function') return

  const originalFetch = window.fetch.bind(window)

  window.fetch = async function (input, init) {
    const url    = typeof input === 'string' ? input : (input as Request).url
    const method =
      init?.method ??
      (typeof input !== 'string' ? (input as Request).method : undefined) ??
      'GET'
    const start = Date.now()

    try {
      const res = await originalFetch(input, init)

      _himero?._addBreadcrumb({
        type:      'fetch',
        timestamp: Date.now(),
        data: {
          url:      url.slice(0, 200),
          method,
          status:   res.status,
          duration: Date.now() - start,
        },
      })

      // Log server errors as additional breadcrumbs for context
      if (res.status >= 500) {
        _himero?._addBreadcrumb({
          type:      'log',
          timestamp: Date.now(),
          data: {
            level:   'error',
            message: `Server error: ${method} ${url.slice(0, 150)} [${res.status}]`,
          },
        })
      }

      return res
    } catch (err) {
      _himero?._addBreadcrumb({
        type:      'fetch',
        timestamp: Date.now(),
        data: {
          url:      url.slice(0, 200),
          method,
          status:   0,
          error:    String(err),
          duration: Date.now() - start,
        },
      })
      throw err
    }
  }
}

// ---------------------------------------------------------------------------
// XMLHttpRequest
// ---------------------------------------------------------------------------

function instrumentXHR(): void {
  if (typeof XMLHttpRequest === 'undefined') return

  const proto    = XMLHttpRequest.prototype
  const origOpen = proto.open as (...args: unknown[]) => void
  const origSend = proto.send as (...args: unknown[]) => void

  // Capture method + URL at open time
  proto.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    ;(this as unknown as Record<string, unknown>)._himero_method = method
    ;(this as unknown as Record<string, unknown>)._himero_url    = String(url)
    return origOpen.call(this, method, url, ...rest)
  }

  proto.send = function (...args: unknown[]) {
    const self   = this as unknown as Record<string, unknown> & XMLHttpRequest
    const start  = Date.now()
    const method = (self._himero_method as string | undefined) ?? 'GET'
    const url    = (self._himero_url    as string | undefined) ?? ''

    self.addEventListener('loadend', () => {
      _himero?._addBreadcrumb({
        type:      'fetch',
        timestamp: Date.now(),
        data: {
          url:       url.slice(0, 200),
          method,
          status:    self.status,
          duration:  Date.now() - start,
          transport: 'xhr',
        },
      })
    })

    return origSend.call(this, ...args)
  }
}

// ---------------------------------------------------------------------------
// console.error / console.warn
// ---------------------------------------------------------------------------

function instrumentConsole(): void {
  const levels = ['error', 'warn'] as const

  for (const level of levels) {
    const orig = console[level].bind(console)

    console[level] = function (...args: unknown[]) {
      _himero?._addBreadcrumb({
        type:      'log',
        timestamp: Date.now(),
        data: {
          level,
          message: args
            .map((a) =>
              typeof a === 'string'
                ? a
                : a instanceof Error
                ? a.message
                : JSON.stringify(a),
            )
            .join(' ')
            .slice(0, 200),
        },
      })
      return orig(...args)
    }
  }
}

// ---------------------------------------------------------------------------
// Navigation breadcrumbs (History API + hashchange)
// ---------------------------------------------------------------------------

function instrumentNavigation(): void {
  if (!window.location) return
  let lastUrl = window.location.href

  const record = (to: string): void => {
    _himero?._addBreadcrumb({
      type:      'navigation',
      timestamp: Date.now(),
      data: {
        from: lastUrl.slice(0, 200),
        to:   to.slice(0, 200),
      },
    })
    lastUrl = to
  }

  const origPush    = history.pushState.bind(history)
  const origReplace = history.replaceState.bind(history)

  history.pushState = function (state, title, url) {
    origPush(state, title, url)
    record(window.location.href)
  }

  history.replaceState = function (state, title, url) {
    origReplace(state, title, url)
    record(window.location.href)
  }

  window.addEventListener('popstate',    () => record(window.location.href))
  window.addEventListener('hashchange',  () => record(window.location.href))
}

// ---------------------------------------------------------------------------
// Click breadcrumbs
// ---------------------------------------------------------------------------

function instrumentClicks(): void {
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      const tag  = target.tagName?.toLowerCase() ?? 'unknown'
      const text = (
        target.textContent ?? target.getAttribute('aria-label') ?? ''
      ).trim().slice(0, 60)

      const id =
        target.id ? `#${target.id}` : ''

      const cls =
        target.className && typeof target.className === 'string'
          ? `.${target.className.trim().split(/\s+/)[0]}`
          : ''

      _himero?._addBreadcrumb({
        type:      'click',
        timestamp: Date.now(),
        data: {
          element: `${tag}${id}${cls}`.slice(0, 100),
          text,
        },
      })
    },
    { capture: true, passive: true },
  )
}
