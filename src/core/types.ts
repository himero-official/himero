export type Severity = 'critical' | 'warning' | 'info'
export type BreadcrumbType = 'navigation' | 'click' | 'fetch' | 'log' | 'input' | 'custom'

export interface HIMEROUser {
  id?: string | number
  email?: string
  username?: string
  [key: string]: unknown
}

export interface Breadcrumb {
  type: BreadcrumbType
  timestamp: number  // absolute ms timestamp (Date.now())
  data: Record<string, string | number | boolean>
}

export interface CaptureContext {
  userId?: string | number
  user?: HIMEROUser
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  level?: Severity
  componentStack?: string
  requestContext?: RequestContext
}

export interface RequestContext {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: unknown
  params?: Record<string, string>
  query?: Record<string, string>
  statusCode?: number
}

export interface ParsedStackFrame {
  function?: string
  file?: string
  line?: number
  column?: number
  inApp?: boolean
}

export interface IngestPayload {
  error_type: string
  error_message: string
  stack_trace: string | null
  source_file: string | null
  source_line: number | null
  source_column: number | null
  source_snippet: string | null
  url: string | null
  user_agent: string | null
  session_id: string | null
  user_id: string | null
  git_commit: string | null
  environment: string
  breadcrumbs: Array<{
    type: string
    timestamp: number
    data: Record<string, string | number | boolean>
  }>
}
