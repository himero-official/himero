/**
 * himero/nestjs — NestJS integration
 *
 * Provides:
 *  - HIMEROExceptionFilter — @Catch() ExceptionFilter that captures all unhandled exceptions
 *
 * Usage:
 * ```ts
 * // main.ts
 * import { NestFactory } from '@nestjs/core'
 * import { AppModule } from './app.module'
 * import HIMERO from 'himero/node'
 * import { HimeroModule } from 'himero/nestjs'
 *
 * async function bootstrap() {
 *   HIMERO.init({ apiKey: process.env.HIMERO_API_KEY! })
 *
 *   const app = await NestFactory.create(AppModule)
 *   app.useGlobalFilters(new HIMEROExceptionFilter(HIMERO))
 *   await app.listen(3000)
 * }
 * bootstrap()
 * ```
 */

export { HIMEROExceptionFilter } from './integrations/nestjs'
