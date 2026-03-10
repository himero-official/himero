import type { HIMEROConfig } from './config'
import type { CaptureContext, HIMEROUser, Breadcrumb, BreadcrumbType } from './types'
import { resolveConfig } from './config'
import { BreadcrumbBuffer } from './breadcrumbs'
import { captureError as _captureError } from './capture'

/**
 * HIMERO — main SDK singleton.
 *
 * All public methods are static so the SDK can be imported and used anywhere
 * without maintaining a reference to an instance.
 *
 * Usage:
 *   HIMERO.init({ apiKey: 'dvk_...' })
 *   HIMERO.captureError(new Error('oops'))
 */
export class HIMERO {
  private static _config: ReturnType<typeof resolveConfig> | null = null
  private static _breadcrumbs: BreadcrumbBuffer = new BreadcrumbBuffer(50)
  private static _user: HIMEROUser | null = null
  private static _extraContext: Record<string, unknown> = {}
  private static _initialized = false

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  /**
   * Initialise the SDK. Must be called once — typically in the app entry point.
   *
   * In development you may call init multiple times with debug: true to
   * reconfigure on hot-reload; in production subsequent calls are no-ops.
   */
  static init(config: HIMEROConfig): void {
    if (HIMERO._initialized && !config.debug) return

    HIMERO._config       = resolveConfig(config)
    HIMERO._breadcrumbs  = new BreadcrumbBuffer(HIMERO._config.maxBreadcrumbs)
    HIMERO._initialized  = true

    if (HIMERO._config.debug) {
      console.log('[HIMERO] Initialized', {
        endpoint:    HIMERO._config.endpoint,
        environment: HIMERO._config.environment,
        release:     HIMERO._config.release ?? '(not set)',
        sampleRate:  HIMERO._config.sampleRate,
      })
    }

    // Auto-install platform integrations
    // React Native has a `window` object but lacks window.location / DOM APIs
    const isReactNative =
      typeof navigator !== 'undefined' && navigator.product === 'ReactNative'

    if (!isReactNative && typeof window !== 'undefined') {
      // Browser environment
      import('../integrations/browser').then(({ installBrowserIntegration }) => {
        installBrowserIntegration(HIMERO)
      }).catch(() => { /* non-critical */ })
    } else if (!isReactNative && typeof process !== 'undefined') {
      // Node.js environment
      import('../integrations/node').then(({ installNodeIntegration }) => {
        installNodeIntegration(HIMERO)
      }).catch(() => { /* non-critical */ })
    }
    // React Native: install RN-specific integration (ErrorUtils + console instrumentation)
    if (isReactNative) {
      import('../integrations/reactnative').then(({ installReactNativeIntegration }) => {
        installReactNativeIntegration(HIMERO)
      }).catch(() => { /* non-critical */ })
    }

    // 연결 핑 — 대시보드에 SDK 연결 상태를 즉시 표시하기 위해
    // fire-and-forget, 실패해도 SDK 동작에 영향 없음
    HIMERO._sendPing()
  }

  private static _sendPing(): void {
    const cfg = HIMERO._config
    if (!cfg || !cfg.enabled) return

    const pingUrl = cfg.endpoint.replace(/\/api\/ingest$/, '/api/ping')

    const isReactNative =
      typeof navigator !== 'undefined' && navigator.product === 'ReactNative'

    const send = () =>
      fetch(pingUrl, {
        method: 'POST',
        headers: { 'x-himero-key': cfg.apiKey },
        // keepalive not supported in React Native
        ...(isReactNative ? {} : { keepalive: true }),
      }).catch(() => { /* non-critical */ })

    // 브라우저에서 requestIdleCallback이 있으면 유휴 시간에 전송
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => send(), { timeout: 5000 })
    } else {
      // Node.js / 구형 브라우저: 다음 틱에 전송
      Promise.resolve().then(send)
    }
  }

  // -------------------------------------------------------------------------
  // Error capture
  // -------------------------------------------------------------------------

  /**
   * Capture an error and send it to HIMERO.
   *
   * Accepts any value — Error instances, strings, rejected promise values, etc.
   */
  static captureError(error: Error | unknown, context?: CaptureContext): void {
    if (!HIMERO._config) {
      console.warn('[HIMERO] Not initialized. Call HIMERO.init({ apiKey }) first.')
      return
    }
    _captureError(
      error,
      context,
      HIMERO._config,
      HIMERO._breadcrumbs,
      HIMERO._user,
      HIMERO._extraContext,
    )
  }

  /**
   * Capture a plain message as a synthetic error.
   * Useful for logging non-exception issues.
   */
  static captureMessage(
    message: string,
    level: 'critical' | 'warning' | 'info' = 'info',
    context?: CaptureContext,
  ): void {
    const err = new Error(message)
    err.name  = `Message[${level}]`
    HIMERO.captureError(err, { ...context, level })
  }

  // -------------------------------------------------------------------------
  // User context
  // -------------------------------------------------------------------------

  /**
   * Associate the current user with all subsequent error reports.
   * Pass null to clear the user (e.g., on logout).
   */
  static setUser(user: HIMEROUser | null): void {
    HIMERO._user = user
  }

  // -------------------------------------------------------------------------
  // Extra context
  // -------------------------------------------------------------------------

  /**
   * Attach an arbitrary key/value pair to all subsequent error reports.
   * Values are serialised to JSON — keep them small and serialisable.
   */
  static setContext(key: string, value: unknown): void {
    HIMERO._extraContext[key] = value
  }

  // -------------------------------------------------------------------------
  // Breadcrumbs
  // -------------------------------------------------------------------------

  /**
   * Manually add a breadcrumb.
   * Breadcrumbs are attached to the next captured error for timeline context.
   */
  static addBreadcrumb(
    type: BreadcrumbType,
    data: Record<string, string | number | boolean>,
  ): void {
    if (!HIMERO._config) return

    const crumb: Breadcrumb = { type, timestamp: Date.now(), data }

    const filtered = HIMERO._config.beforeBreadcrumb
      ? HIMERO._config.beforeBreadcrumb(crumb)
      : crumb

    if (filtered) HIMERO._breadcrumbs.add(filtered)
  }

  // -------------------------------------------------------------------------
  // Internal helpers (used by integrations — prefixed with _)
  // -------------------------------------------------------------------------

  /** Add a breadcrumb bypassing the beforeBreadcrumb filter (for integrations) */
  static _addBreadcrumb(crumb: Breadcrumb): void {
    if (!HIMERO._config) return
    HIMERO._breadcrumbs.add(crumb)
  }

  // -------------------------------------------------------------------------
  // Accessors (read-only, for integrations)
  // -------------------------------------------------------------------------

  static get breadcrumbBuffer(): BreadcrumbBuffer { return HIMERO._breadcrumbs }
  static get config(): ReturnType<typeof resolveConfig> | null { return HIMERO._config }
  static get user(): HIMEROUser | null { return HIMERO._user }
  static get extraContext(): Record<string, unknown> { return HIMERO._extraContext }

  /** True after init() has been called successfully */
  static get isInitialized(): boolean { return HIMERO._initialized }
}

export default HIMERO
