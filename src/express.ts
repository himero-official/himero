/**
 * himero/express — Express.js integration
 *
 * Provides:
 *  - himeroErrorHandler()       — 4-argument error handling middleware
 *  - himeroRequestMiddleware()  — request logging breadcrumb middleware
 *
 * Usage:
 * ```ts
 * import express from 'express'
 * import HIMERO from 'himero/node'
 * import { himeroErrorHandler, himeroRequestMiddleware } from 'himero/express'
 *
 * HIMERO.init({ apiKey: process.env.HIMERO_API_KEY! })
 *
 * const app = express()
 * app.use(himeroRequestMiddleware(HIMERO))  // optional: request breadcrumbs
 * app.use('/api', myRouter)
 * app.use(himeroErrorHandler(HIMERO))       // LAST: error capture
 * ```
 */

export { himeroErrorHandler, himeroRequestMiddleware } from './integrations/express'
