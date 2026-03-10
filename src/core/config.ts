import type { Breadcrumb, IngestPayload } from './types'

export interface HIMEROConfig {
  /** Your HIMERO project API key */
  apiKey: string
  /** Ingest endpoint. Default: 'https://himero.app/api/ingest' */
  endpoint?: string
  /** Deployment environment. Default: process.env.NODE_ENV */
  environment?: string
  /** Git commit SHA or version string for release tracking */
  release?: string
  /** Maximum breadcrumbs to retain. Default: 50 */
  maxBreadcrumbs?: number
  /** Error sampling rate (0.0–1.0). Default: 1.0 (all errors) */
  sampleRate?: number
  /** Enable debug logging. Default: false */
  debug?: boolean
  /** Disable the SDK entirely (useful for test environments). Default: true */
  enabled?: boolean
  /** Patterns to ignore — matched against error type and message */
  ignoreErrors?: Array<string | RegExp>
  /** Ignore errors originating from URLs matching these patterns */
  ignoreUrls?: Array<string | RegExp>
  /**
   * Hook called before every event is sent.
   * Return the (optionally modified) payload to send, or null/false to drop it.
   */
  beforeSend?: (
    payload: IngestPayload,
    hint: { originalError: Error | unknown },
  ) => IngestPayload | null | false
  /**
   * Hook called before every breadcrumb is added.
   * Return the (optionally modified) breadcrumb to keep, or null/false to drop it.
   */
  beforeBreadcrumb?: (breadcrumb: Breadcrumb) => Breadcrumb | null | false
}

export const DEFAULT_ENDPOINT = 'https://himero.app/api/ingest'

type ResolvedConfig = Required<
  Omit<HIMEROConfig, 'beforeSend' | 'beforeBreadcrumb' | 'release' | 'ignoreErrors' | 'ignoreUrls'>
> &
  Pick<HIMEROConfig, 'beforeSend' | 'beforeBreadcrumb' | 'release' | 'ignoreErrors' | 'ignoreUrls'>

export function resolveConfig(config: HIMEROConfig): ResolvedConfig {
  if (!config.apiKey) throw new Error('[HIMERO] apiKey is required')

  const nodeEnv =
    typeof process !== 'undefined' ? (process.env.NODE_ENV ?? 'production') : 'production'

  return {
    apiKey:           config.apiKey,
    endpoint:         config.endpoint ?? DEFAULT_ENDPOINT,
    environment:      config.environment ?? nodeEnv,
    maxBreadcrumbs:   config.maxBreadcrumbs ?? 50,
    sampleRate:       config.sampleRate ?? 1.0,
    debug:            config.debug ?? false,
    enabled:          config.enabled ?? true,
    release:          config.release,
    ignoreErrors:     config.ignoreErrors,
    ignoreUrls:       config.ignoreUrls,
    beforeSend:       config.beforeSend,
    beforeBreadcrumb: config.beforeBreadcrumb,
  }
}
