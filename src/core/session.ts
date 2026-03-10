/**
 * Session ID management.
 * - Browser: stored in sessionStorage — stable within a single tab, reset on new tab
 * - Node.js: stable per process lifetime
 */

let _sessionId: string | null = null

export function getSessionId(): string {
  if (_sessionId) return _sessionId

  // Browser: persist in sessionStorage for same-tab stability
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('__himero_sid')
      if (stored) {
        _sessionId = stored
        return stored
      }
      const id = generateId()
      sessionStorage.setItem('__himero_sid', id)
      _sessionId = id
      return id
    } catch {
      /* Ignore — sessionStorage may be blocked in some contexts */
    }
  }

  // Node.js / fallback: generate once per process
  _sessionId = generateId()
  return _sessionId
}

/** Reset session ID (e.g., after logout) */
export function resetSessionId(): void {
  _sessionId = null
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem('__himero_sid')
    } catch {
      /* ignore */
    }
  }
}

function generateId(): string {
  // Prefer the native crypto.randomUUID when available (browser + Node 19+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
