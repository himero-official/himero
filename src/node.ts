/**
 * himero/node — Node.js entry point
 *
 * Use this in server-side Node.js code (API servers, scripts, etc.)
 * when you want to explicitly import the Node.js integration without
 * the auto-detect logic in the main index entry.
 *
 * Usage:
 * ```ts
 * import HIMERO from 'himero/node'
 *
 * HIMERO.init({ apiKey: process.env.HIMERO_API_KEY! })
 * ```
 *
 * The installNodeIntegration export is exposed for advanced use cases
 * where you manage the integration lifecycle yourself.
 */

export { HIMERO, HIMERO as default } from './core/HIMERO'
export { installNodeIntegration } from './integrations/node'
export type { HIMEROConfig } from './core/config'
export type { HIMEROUser, CaptureContext } from './core/types'
