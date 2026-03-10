/**
 * NestJS ExceptionFilter integration for HIMERO.
 *
 * Uses type-only imports from @nestjs/common so this file can be compiled and
 * included in the bundle WITHOUT requiring @nestjs/common to be present at
 * runtime in non-NestJS projects.
 *
 * Usage in main.ts:
 * ```ts
 * import { NestFactory } from '@nestjs/core'
 * import { AppModule } from './app.module'
 * import HIMERO from 'himero/node'
 * import { HIMEROExceptionFilter } from 'himero/nestjs'
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
 *
 * Per-controller / per-handler usage:
 * ```ts
 * import { UseFilters } from '@nestjs/common'
 * import { HIMEROExceptionFilter } from 'himero/nestjs'
 * import HIMERO from 'himero/node'
 *
 * @UseFilters(new HIMEROExceptionFilter(HIMERO))
 * @Controller('cats')
 * export class CatsController {}
 * ```
 */

// Inline minimal types — avoids any @nestjs/common dependency
interface ArgumentsHost {
  getType<TResult extends string = string>(): TResult
  switchToHttp(): {
    getRequest<T = unknown>(): T
    getResponse<T = unknown>(): T
  }
  switchToRpc(): unknown
  switchToWs(): unknown
  getArgs<T extends unknown[] = unknown[]>(): T
  getArgByIndex<T = unknown>(index: number): T
}

interface ExceptionFilter<T = unknown> {
  catch(exception: T, host: ArgumentsHost): void
}

interface HIMEROCapture {
  captureError: (error: unknown, context?: unknown) => void
  _addBreadcrumb: (breadcrumb: {
    type: string
    timestamp: number
    data: Record<string, string | number | boolean>
  }) => void
}

export class HIMEROExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly himero: HIMEROCapture,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const hostType = host.getType<string>()

    // -----------------------------------------------------------------------
    // HTTP context
    // -----------------------------------------------------------------------
    if (hostType === 'http') {
      const ctx        = host.switchToHttp()
      const req        = ctx.getRequest<Record<string, unknown>>()
      const url        = (req?.url as string | undefined)    ?? ''
      const method     = (req?.method as string | undefined) ?? ''

      // Determine status code — HttpException exposes getStatus()
      const statusCode: number =
        typeof (exception as Record<string, unknown>)?.['getStatus'] === 'function'
          ? ((exception as Record<string, () => number>).getStatus())
          : 500

      // 4xx client errors: record as a breadcrumb but don't open a HIMERO issue
      if (statusCode >= 400 && statusCode < 500) {
        this.himero._addBreadcrumb({
          type:      'log',
          timestamp: Date.now(),
          data: {
            level:  'warning',
            status: statusCode,
            method,
            url:    url.slice(0, 200),
            message: getErrorMessage(exception),
          },
        })
        return
      }

      // 5xx server errors: capture as a full error
      const error = normaliseException(exception)
      this.himero.captureError(error, {
        requestContext: { url, method, statusCode },
      })
      return
    }

    // -----------------------------------------------------------------------
    // RPC / WebSocket / GraphQL contexts
    // -----------------------------------------------------------------------
    const error = normaliseException(exception)
    this.himero.captureError(error)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseException(exception: unknown): Error {
  if (exception instanceof Error) return exception

  const message = getErrorMessage(exception)
  const err     = new Error(message)
  err.name      = 'NestJSException'
  return err
}

function getErrorMessage(exception: unknown): string {
  if (exception instanceof Error) return exception.message
  if (typeof exception === 'string') return exception
  if (
    typeof exception === 'object' &&
    exception !== null &&
    'message' in exception
  ) {
    const msg = (exception as Record<string, unknown>).message
    return typeof msg === 'string' ? msg : JSON.stringify(msg)
  }
  return String(exception)
}
