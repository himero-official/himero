'use client'

import React from 'react'

// ---------------------------------------------------------------------------
// HIMEROGlobalError
// ---------------------------------------------------------------------------

interface GlobalErrorProps {
  error:  Error & { digest?: string }
  reset:  () => void
  /** Your NEXT_PUBLIC_HIMERO_KEY — passed as a prop so it works in client components */
  apiKey: string
}

/**
 * Drop-in replacement for `app/global-error.tsx`.
 *
 * Captures the global error with HIMERO and renders a full-page error UI.
 *
 * ```tsx
 * // app/global-error.tsx
 * 'use client'
 * import { HIMEROGlobalError } from 'himero/nextjs'
 *
 * export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
 *   return (
 *     <HIMEROGlobalError
 *       error={error}
 *       reset={reset}
 *       apiKey={process.env.NEXT_PUBLIC_HIMERO_KEY!}
 *     />
 *   )
 * }
 * ```
 *
 * Note: global-error.tsx MUST export an `<html>` + `<body>` tree because it
 * replaces the root layout when rendering.
 */
export function HIMEROGlobalError({ error, reset, apiKey }: GlobalErrorProps) {
  React.useEffect(() => {
    import('../core/HIMERO')
      .then(({ HIMERO }) => {
        if (!HIMERO.isInitialized) HIMERO.init({ apiKey })
        HIMERO.captureError(error, {
          level: 'critical',
          extra: { digest: error.digest },
        })
      })
      .catch(() => {
        /* non-critical — don't surface HIMERO errors to user */
      })
  }, [error, apiKey])

  return (
    <html>
      <body>
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            minHeight:      '100vh',
            padding:        '2rem',
            textAlign:      'center',
            fontFamily:     'system-ui, sans-serif',
            background:     '#0a0c10',
            color:          '#f9fafb',
          }}
        >
          <h2
            style={{
              fontSize:     '1.5rem',
              fontWeight:   700,
              marginBottom: '0.5rem',
            }}
          >
            오류가 발생했습니다
          </h2>

          <p
            style={{
              color:         '#9ca3af',
              marginBottom:  '1.5rem',
              maxWidth:      '40ch',
              lineHeight:    1.6,
            }}
          >
            {error.message || '예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}
          </p>

          <button
            onClick={reset}
            style={{
              padding:      '0.625rem 1.5rem',
              background:   '#6366f1',
              color:        '#fff',
              borderRadius: '8px',
              border:       'none',
              cursor:       'pointer',
              fontWeight:   600,
              fontSize:     '0.9375rem',
              transition:   'opacity 0.15s',
            }}
          >
            다시 시도
          </button>

          {error.digest && (
            <p
              style={{
                fontSize:   '0.75rem',
                color:      '#4b5563',
                marginTop:  '1.5rem',
                fontFamily: 'monospace',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}

// ---------------------------------------------------------------------------
// HIMERORouteError
// ---------------------------------------------------------------------------

interface RouteErrorProps {
  error:  Error & { digest?: string }
  reset:  () => void
  /** Your NEXT_PUBLIC_HIMERO_KEY */
  apiKey: string
}

/**
 * Drop-in replacement for route-level `error.tsx` files.
 *
 * ```tsx
 * // app/(dashboard)/error.tsx
 * 'use client'
 * import { HIMERORouteError } from 'himero/nextjs'
 *
 * export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
 *   return (
 *     <HIMERORouteError
 *       error={error}
 *       reset={reset}
 *       apiKey={process.env.NEXT_PUBLIC_HIMERO_KEY!}
 *     />
 *   )
 * }
 * ```
 */
export function HIMERORouteError({ error, reset, apiKey }: RouteErrorProps) {
  React.useEffect(() => {
    import('../core/HIMERO')
      .then(({ HIMERO }) => {
        if (!HIMERO.isInitialized) HIMERO.init({ apiKey })
        HIMERO.captureError(error, {
          extra: { digest: error.digest },
        })
      })
      .catch(() => {
        /* non-critical */
      })
  }, [error, apiKey])

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '3rem 2rem',
        textAlign:      'center',
        fontFamily:     'system-ui, sans-serif',
      }}
    >
      <p
        style={{
          color:        '#ef4444',
          fontWeight:   600,
          marginBottom: '1rem',
        }}
      >
        이 페이지에서 오류가 발생했습니다.
      </p>

      {error.message && (
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          {error.message}
        </p>
      )}

      <button
        onClick={reset}
        style={{
          padding:      '0.5rem 1.25rem',
          background:   '#6366f1',
          color:        '#fff',
          borderRadius: '6px',
          border:       'none',
          cursor:       'pointer',
          fontWeight:   600,
        }}
      >
        다시 시도
      </button>

      {error.digest && (
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '1rem', fontFamily: 'monospace' }}>
          {error.digest}
        </p>
      )}
    </div>
  )
}
