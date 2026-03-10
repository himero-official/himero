/**
 * himero/nextjs — Next.js integration
 *
 * Server-side:
 *  - registerHIMERO()          — call inside instrumentation.ts register()
 *  - withHIMERORequestError()  — onRequestError handler for Next.js 15+
 *
 * Client-side (React Server Components / Client Components):
 *  - HIMEROGlobalError         — drop-in app/global-error.tsx
 *  - HIMERORouteError          — drop-in app/[segment]/error.tsx
 *
 * Usage:
 * ```ts
 * // instrumentation.ts
 * import HIMERO from 'himero/nextjs'
 *
 * export async function register() {
 *   await HIMERO.registerHIMERO({ apiKey: process.env.HIMERO_API_KEY! })
 * }
 *
 * export const onRequestError = HIMERO.withHIMERORequestError({
 *   apiKey: process.env.HIMERO_API_KEY!,
 * })
 * ```
 */

export { registerHIMERO, withHIMERORequestError } from './integrations/nextjs'
export { HIMEROGlobalError, HIMERORouteError } from './integrations/nextjs-react'
