import React, { Component, useCallback } from 'react'
import type { HIMERO as HIMEROClass } from '../core/HIMERO'
import type { CaptureContext } from '../core/types'

type HIMEROStatic = typeof HIMEROClass

// ---------------------------------------------------------------------------
// HIMEROErrorBoundary
// ---------------------------------------------------------------------------

export interface ErrorBoundaryProps {
  /**
   * The HIMERO singleton (import HIMERO from 'himero').
   * Optional — if omitted, the SDK singleton is imported automatically.
   */
  himero?: HIMEROStatic
  /**
   * Fallback UI to render when an error is caught.
   * Can be a static ReactNode or a render function receiving the error and a reset callback.
   */
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode)
  /** Optional callback invoked after the error is captured */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary that automatically captures errors to HIMERO.
 *
 * Usage:
 * ```tsx
 * import HIMERO from 'himero'
 * import { HIMEROErrorBoundary } from 'himero/react'
 *
 * export default function App() {
 *   return (
 *     <HIMEROErrorBoundary himero={HIMERO} fallback={<p>Something went wrong</p>}>
 *       <MyApp />
 *     </HIMEROErrorBoundary>
 *   )
 * }
 * ```
 *
 * With a render-prop fallback:
 * ```tsx
 * <HIMEROErrorBoundary
 *   himero={HIMERO}
 *   fallback={(error, reset) => (
 *     <div>
 *       <p>{error.message}</p>
 *       <button onClick={reset}>Retry</button>
 *     </div>
 *   )}
 * >
 *   <MyApp />
 * </HIMEROErrorBoundary>
 * ```
 */
export class HIMEROErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const ctx: CaptureContext = {
      extra: { componentStack: errorInfo.componentStack ?? '' },
    }

    if (this.props.himero) {
      this.props.himero.captureError(error, ctx)
    } else {
      // himero prop omitted — auto-import the singleton (works in all environments)
      import('../core/HIMERO')
        .then(({ HIMERO }) => HIMERO.captureError(error, ctx))
        .catch(() => { /* non-critical */ })
    }

    this.props.onError?.(error, errorInfo)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children

    const { fallback } = this.props

    // Default built-in fallback
    if (!fallback) {
      return (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#ef4444',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            오류가 발생했습니다
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={this.reset}
            style={{
              padding: '0.5rem 1.25rem',
              background: '#6366f1',
              color: '#fff',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            다시 시도
          </button>
        </div>
      )
    }

    // Render-prop fallback
    if (typeof fallback === 'function') {
      return fallback(this.state.error!, this.reset)
    }

    // Static ReactNode fallback
    return fallback
  }
}

// ---------------------------------------------------------------------------
// useHIMERO hook
// ---------------------------------------------------------------------------

/**
 * Hook that returns memoised HIMERO capture helpers for use in functional components.
 *
 * Usage:
 * ```tsx
 * import HIMERO from 'himero'
 * import { useHIMERO } from 'himero/react'
 *
 * export function MyComponent() {
 *   const { captureError, captureMessage } = useHIMERO(HIMERO)
 *
 *   const handleClick = async () => {
 *     try {
 *       await riskyOperation()
 *     } catch (err) {
 *       captureError(err)
 *     }
 *   }
 *
 *   return <button onClick={handleClick}>Do something risky</button>
 * }
 * ```
 */
export function useHIMERO(himero: HIMEROStatic) {
  const captureError = useCallback(
    (error: Error | unknown, context?: CaptureContext) => {
      himero.captureError(error, context)
    },
    [himero],
  )

  const captureMessage = useCallback(
    (
      message: string,
      level: 'critical' | 'warning' | 'info' = 'info',
      context?: CaptureContext,
    ) => {
      himero.captureMessage(message, level, context)
    },
    [himero],
  )

  const addBreadcrumb = useCallback(
    (
      type: 'navigation' | 'click' | 'fetch' | 'log' | 'input' | 'custom',
      data: Record<string, string | number | boolean>,
    ) => {
      himero.addBreadcrumb(type, data)
    },
    [himero],
  )

  const setUser = useCallback(
    (user: { id?: string | number; email?: string; username?: string } | null) => {
      himero.setUser(user)
    },
    [himero],
  )

  return { captureError, captureMessage, addBreadcrumb, setUser }
}
