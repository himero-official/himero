/**
 * himero — Main entry point
 *
 * Universal SDK for browser and Node.js environments.
 * Auto-detects the runtime and installs the appropriate integrations
 * when HIMERO.init() is called.
 *
 * Quick start:
 * ```ts
 * import HIMERO from 'himero'
 *
 * HIMERO.init({
 *   apiKey: 'dvk_your_api_key_here',
 *   environment: process.env.NODE_ENV,
 * })
 * ```
 */

export { HIMERO, HIMERO as default } from './core/HIMERO'
export type { HIMEROConfig } from './core/config'
export type {
  HIMEROUser,
  CaptureContext,
  Breadcrumb,
  BreadcrumbType,
  Severity,
  IngestPayload,
  ParsedStackFrame,
  RequestContext,
} from './core/types'
