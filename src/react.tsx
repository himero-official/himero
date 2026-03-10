/**
 * himero/react — React integration
 *
 * Provides:
 *  - HIMEROErrorBoundary: class component error boundary
 *  - useHIMERO: hook with memoised captureError / captureMessage helpers
 *
 * Usage:
 * ```tsx
 * import HIMERO from 'himero'
 * import { HIMEROErrorBoundary } from 'himero/react'
 * ```
 */

export { HIMEROErrorBoundary, useHIMERO } from './integrations/react'
export type { ErrorBoundaryProps } from './integrations/react'
