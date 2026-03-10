import type { ParsedStackFrame } from './types'

/**
 * Patterns that identify non-user ("library") code frames.
 * Frames matching these are marked inApp: false and deprioritised when
 * selecting the "top frame" to attach to the error report.
 */
const INTERNAL_PATTERNS: RegExp[] = [
  /node_modules/,
  /node:internal/,
  /at new Promise/,
  /<anonymous>/,
  /webpack-internal/,
  /next\/dist/,
  /__webpack_require__/,
  /webpack:\/\/\/webpack\/runtime/,
  /\(native\)/,
  /eval\s+at/,
]

// V8:          "    at FunctionName (file.js:10:5)"
// V8 anon:     "    at file.js:10:5"
const V8_RE = /^\s*at (?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/

// Firefox/SpiderMonkey: "functionName@file.js:10:5"
// JavaScriptCore:       "functionName@file.js:10:5"
const FF_RE = /^(?:(.+?)@)?(.+?):(\d+):(\d+)$/

function isInternal(file: string): boolean {
  return INTERNAL_PATTERNS.some((p) => p.test(file))
}

/** Parse a raw error stack string into structured frames */
export function parseStackTrace(stack: string): ParsedStackFrame[] {
  if (!stack) return []

  const lines = stack.split('\n')
  // The first line is usually "ErrorType: message", skip it
  const frameLines = lines.slice(1)
  const frames: ParsedStackFrame[] = []

  for (const line of frameLines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Try V8 format first
    let match = V8_RE.exec(trimmed)
    if (match) {
      const file = match[2]
      frames.push({
        function: match[1] ?? '<anonymous>',
        file,
        line:     parseInt(match[3], 10),
        column:   parseInt(match[4], 10),
        inApp:    !isInternal(file),
      })
      continue
    }

    // Try Firefox/JSC format
    match = FF_RE.exec(trimmed)
    if (match) {
      const file = match[2]
      frames.push({
        function: match[1] ?? '<anonymous>',
        file,
        line:     parseInt(match[3], 10),
        column:   parseInt(match[4], 10),
        inApp:    !isInternal(file),
      })
    }
  }

  return frames
}

/**
 * Find the topmost user-code frame (inApp: true).
 * Falls back to the first frame of any kind if no user frame exists.
 */
export function getTopFrame(frames: ParsedStackFrame[]): ParsedStackFrame | null {
  return frames.find((f) => f.inApp) ?? frames[0] ?? null
}

/** Extract the raw stack string from an error-like object */
export function formatStack(error: Error | { stack?: string } | unknown): string {
  if (error instanceof Error && error.stack) return error.stack
  if (error && typeof error === 'object' && 'stack' in error) {
    const s = (error as { stack?: unknown }).stack
    if (typeof s === 'string') return s
  }
  return String(error)
}
