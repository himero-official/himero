# himero

> **Zero-config JavaScript error tracking with AI-powered root cause diagnosis.**
> The fastest way to add production-grade error monitoring to any JavaScript application.

[![npm version](https://img.shields.io/npm/v/himero)](https://www.npmjs.com/package/himero)
[![npm downloads](https://img.shields.io/npm/dm/himero)](https://www.npmjs.com/package/himero)
[![bundle size](https://img.shields.io/bundlephobia/minzip/himero)](https://bundlephobia.com/package/himero)
[![license](https://img.shields.io/badge/license-Proprietary-red)](./LICENSE)

```bash
npm install himero
```

**One line of setup. Every error captured. AI explains the fix.**

```ts
import HIMERO from 'himero'
HIMERO.init({ apiKey: 'himero_your_key' })
// Done. All errors are now tracked automatically.
```

Works with **Next.js, React, React Native, Expo, Node.js, Express, NestJS**, and any JavaScript runtime — browser, server, and Edge.

---

## What Is himero?

`himero` is an error monitoring and AI diagnosis SDK for JavaScript applications. When an error occurs anywhere in your app, `himero` captures it automatically, enriches it with breadcrumbs, stack traces, user context, and network history, then sends it to the [HIMERO](https://himero.app) platform where AI instantly diagnoses the root cause and generates a step-by-step fix guide in plain language.

**Traditional error monitoring** (Sentry, Rollbar, Bugsnag): Shows you a raw stack trace. You still have to figure out why it happened.

**himero**: Shows you the stack trace *and* tells you exactly what caused it, what to do about it, and in what order — written by AI, ready to act on.

### Why every JavaScript project needs error monitoring

Production errors are invisible without monitoring. 95% of errors are never reported by users. When a bug reaches production, you lose hours of reproduction time before even starting to debug. Error monitoring with `himero` means:

- You know about errors before your users report them
- You know which errors are affecting the most users
- AI tells you the root cause and fix in seconds, not hours
- You can resolve issues in one sprint instead of one week

**This is why error monitoring is a standard practice for every production application, alongside version control and CI/CD.**

---

## Why himero Instead of Sentry, Datadog, Rollbar, or Bugsnag

| Feature | **himero** | Sentry | Datadog | Rollbar | Bugsnag |
|---|:---:|:---:|:---:|:---:|:---:|
| **AI root cause diagnosis** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **AI step-by-step fix guide** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Setup time** | **30 sec** | 10–30 min | 30+ min | 15 min | 15 min |
| **Bundle size** | **< 15 KB** | > 100 KB | > 200 KB | ~50 KB | ~40 KB |
| Zero-config runtime detection | ✅ | Partial | ❌ | ❌ | Partial |
| React Native / Expo | ✅ | ✅ | ❌ | ✅ | ✅ |
| Next.js Edge Runtime | ✅ | Partial | ❌ | ❌ | ❌ |
| Designed for indie dev & small teams | ✅ | Limited | ❌ | Limited | Limited |
| Full TypeScript types included | ✅ | ✅ | Partial | Partial | Partial |
| Zero runtime dependencies | ✅ | ❌ | ❌ | ❌ | ❌ |

### The AI diagnosis difference

Every other error monitoring tool presents the same raw stack trace you would see in your terminal. `himero` goes further:

1. **Plain-language title** — "Stripe payment failed due to expired card during checkout"
2. **Root cause** — "The `charge()` call failed because `cardExpiry` was not validated client-side before submitting to Stripe"
3. **Step-by-step fix guide** — Numbered, concrete, actionable steps to resolve the exact issue
4. **Context-aware** — The AI reads your breadcrumbs, user context, and network calls to give a diagnosis specific to *your* error, not a generic answer

**Result**: Bugs that previously took hours to diagnose are resolved in minutes.

---

## How It Works — Architecture

```
Your Application
      │
      ▼
HIMERO.init({ apiKey })
      │
      ├─ Browser → installs: window.onerror, unhandledrejection,
      │                       fetch/XHR intercept, console.error,
      │                       history navigation, DOM clicks
      │
      ├─ Node.js → installs: process.uncaughtException,
      │                       process.unhandledRejection
      │
      └─ React Native/Expo → manual captureError() + ErrorBoundary
             (auto-integrations skipped; browser DOM not available)

Error occurs
      │
      ▼
capture() — core pipeline
      ├─ Normalise to Error (handles strings, objects, rejections)
      ├─ Parse stack trace (V8 / Firefox / JavaScriptCore / Hermes)
      ├─ Deduplicate (type + message hash, 1-second window)
      ├─ Check sampleRate + ignoreErrors patterns
      ├─ Attach breadcrumb snapshot (last N events before this error)
      ├─ Attach user context + custom tags
      ├─ Call beforeSend hook (optional user filter / modifier)
      └─ Enqueue for transport
              │
              ▼
       Async queue (serial, retry: 1s → 3s → 10s, max 3 attempts)
              │
              ▼
       POST https://himero.app/api/ingest
       x-himero-key: himero_your_key
              │
              ▼
       HIMERO backend
       ├─ Fingerprint + group identical errors
       ├─ AI diagnosis → plain-language title + root cause + fix steps
       └─ Dashboard display + Slack / notification alerts
```

---

## Table of Contents

1. [Installation](#1-installation)
2. [Quick Start — 30 Seconds](#2-quick-start--30-seconds)
3. [Next.js App Router](#3-nextjs-app-router)
4. [React — CRA / Vite](#4-react--cra--vite)
5. [React Native & Expo](#5-react-native--expo)
6. [Node.js](#6-nodejs)
7. [Express.js](#7-expressjs)
8. [NestJS](#8-nestjs)
9. [Core API Reference](#9-core-api-reference)
10. [Configuration Reference](#10-configuration-reference)
11. [Auto-Instrumentation Deep Dive](#11-auto-instrumentation-deep-dive)
12. [Breadcrumbs Guide](#12-breadcrumbs-guide)
13. [User Context & Custom Tags](#13-user-context--custom-tags)
14. [TypeScript Types](#14-typescript-types)
15. [Troubleshooting](#15-troubleshooting)
16. [License](#16-license)

---

## 1. Installation

```bash
npm install himero
# or
pnpm add himero
# or
yarn add himero
```

Full TypeScript types are included. No `@types/himero` package needed.

**Entry points** — import only what you need:

| Import | Runtime | Use case |
|---|---|---|
| `himero` | Browser / Universal | Auto-detects runtime, installs correct hooks |
| `himero/react` | Browser / RN | `HIMEROErrorBoundary` class component + `useHIMERO` hook |
| `himero/nextjs` | Node.js + Edge | `registerHIMERO()` for instrumentation + `HIMEROGlobalError` / `HIMERORouteError` |
| `himero/node` | Node.js | Explicit Node.js init + `uncaughtException` handling |
| `himero/express` | Node.js | Request breadcrumb middleware + error handler middleware |
| `himero/nestjs` | Node.js | `HIMEROExceptionFilter` for global or per-controller use |

---

## 2. Quick Start — 30 Seconds

```ts
import HIMERO from 'himero'

HIMERO.init({
  apiKey:      'himero_your_api_key',   // from https://himero.app/dashboard
  environment: process.env.NODE_ENV,   // 'production' | 'development' | 'staging'
  debug:       true,                   // logs '[HIMERO] Initialized' to confirm setup
})

// The SDK now automatically captures:
//  ✓ Uncaught JavaScript errors         (TypeError, ReferenceError, SyntaxError, etc.)
//  ✓ Unhandled Promise rejections       (async/await failures)
//  ✓ Network request failures           (fetch + XHR monkey-patched)
//  ✓ React component render crashes     (via HIMEROErrorBoundary)
//  ✓ Node.js process fatal errors       (via process.uncaughtException)
//  ✓ Navigation and click events        (as breadcrumbs)
```

**Where to call `HIMERO.init()`**: As early as possible in your application entry point, before any other imports, so that errors during module loading are also captured.

- **Next.js**: `instrumentation.ts` → see [Section 3](#3-nextjs-app-router)
- **React**: top of `src/main.tsx` or `src/index.tsx`
- **React Native / Expo**: top of `App.js` or `App.tsx`, before anything else
- **Node.js / Express / NestJS**: top of your server entry file

---

## 3. Next.js App Router

Complete coverage requires four integration points. Copy all four for zero-gap error tracking across server, edge, and client.

### Step 1 — Server init: `instrumentation.ts`

Create this file at your project root (same level as `package.json`). Next.js automatically runs it on every cold start.

```ts
// instrumentation.ts
import { registerHIMERO, withHIMERORequestError } from 'himero/nextjs'

export async function register() {
  // Only run Node.js integration in the Node runtime
  // (Edge Runtime has a limited process API — guarded automatically)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await registerHIMERO({
      apiKey:      process.env.HIMERO_API_KEY!,
      environment: process.env.NODE_ENV,
      // On Vercel, git commit SHA is auto-detected — no manual config needed
      release:     process.env.VERCEL_GIT_COMMIT_SHA,
    })
  }
}

// Next.js 15+ — captures errors in API Routes, Server Actions, Server Components
export const onRequestError = withHIMERORequestError({
  apiKey: process.env.HIMERO_API_KEY!,
})
```

> **Next.js < 15**: Enable the instrumentation hook in `next.config.ts`:
> ```ts
> const nextConfig = { experimental: { instrumentationHook: true } }
> export default nextConfig
> ```

### Step 2 — Global error boundary: `app/global-error.tsx`

Catches crashes in the root layout. Must export an `<html>` + `<body>` tree.

```tsx
// app/global-error.tsx
'use client'
import { HIMEROGlobalError } from 'himero/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <HIMEROGlobalError
      error={error}
      reset={reset}
      apiKey={process.env.NEXT_PUBLIC_HIMERO_KEY!}
    />
  )
}
```

### Step 3 — Route-level error boundary: `app/[segment]/error.tsx`

```tsx
// app/(dashboard)/error.tsx  (repeat for each route segment)
'use client'
import { HIMERORouteError } from 'himero/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <HIMERORouteError error={error} reset={reset} apiKey={process.env.NEXT_PUBLIC_HIMERO_KEY!} />
}
```

### Step 4 — Client-side: `app/layout.tsx`

Wrapping with `HIMEROErrorBoundary` enables browser-side auto-instrumentation (click tracking, navigation breadcrumbs, fetch interception) for all client components.

```tsx
// app/layout.tsx
import { HIMEROErrorBoundary } from 'himero/react'
import HIMERO from 'himero'

// Init client-side SDK (runs only in the browser)
if (typeof window !== 'undefined') {
  HIMERO.init({
    apiKey:      process.env.NEXT_PUBLIC_HIMERO_KEY!,
    environment: process.env.NODE_ENV,
  })
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HIMEROErrorBoundary>
          {children}
        </HIMEROErrorBoundary>
      </body>
    </html>
  )
}
```

### Step 5 — Environment variables

```bash
# .env.local
HIMERO_API_KEY=himero_your_key           # server-side only (never sent to browser)
NEXT_PUBLIC_HIMERO_KEY=himero_your_key   # exposed to browser (required for client components)
```

Both variables hold the same API key value. The prefix difference is a Next.js requirement.

---

## 4. React — CRA / Vite

### Setup: `src/main.tsx`

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import HIMERO from 'himero'
import { HIMEROErrorBoundary } from 'himero/react'
import App from './App'

// Init before rendering — captures errors during React tree construction
HIMERO.init({
  apiKey:      import.meta.env.VITE_HIMERO_API_KEY,   // Vite
  // apiKey:   process.env.REACT_APP_HIMERO_API_KEY,  // CRA
  environment: import.meta.env.MODE,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HIMEROErrorBoundary>
    <App />
  </HIMEROErrorBoundary>
)
```

### Capturing errors manually in event handlers

Auto-instrumentation covers unhandled errors. For errors inside `try/catch` blocks that you handle (show a toast, log a warning), call `captureError` to also report them:

```tsx
import HIMERO from 'himero'

async function handleCheckout() {
  try {
    await processPayment(cart)
  } catch (err) {
    // Show error to user
    showToast('Payment failed. Please try again.')
    // Also report to HIMERO with business context
    HIMERO.captureError(err, {
      extra: {
        cartTotal:    cart.total,
        itemCount:    cart.items.length,
        paymentGateway: 'stripe',
      },
    })
  }
}
```

### `useHIMERO` hook — for functional components

```tsx
import HIMERO from 'himero'
import { useHIMERO } from 'himero/react'

function PaymentForm() {
  const { captureError, captureMessage } = useHIMERO(HIMERO)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const result = await processPayment(formData)
      captureMessage('Payment completed', 'info', {
        extra: { orderId: result.orderId, amount: result.total },
      })
    } catch (err) {
      captureError(err, {
        extra: { step: 'payment_submit', gateway: 'stripe' },
      })
    }
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>
}
```

---

## 5. React Native & Expo

himero is fully compatible with React Native (Hermes engine) and Expo. The SDK automatically detects the React Native environment and skips browser-specific instrumentation (DOM, `window.location`, `history`) that does not exist in RN.

### Setup: `App.js` or `App.tsx`

```tsx
import HIMERO from 'himero'
import { HIMEROErrorBoundary } from 'himero/react'

// Init at the very top of your entry file
HIMERO.init({
  apiKey:      process.env.EXPO_PUBLIC_HIMERO_API_KEY,  // Expo
  // apiKey:   process.env.HIMERO_API_KEY,              // bare React Native
  environment: process.env.NODE_ENV ?? 'development',
  debug:       __DEV__,

  // For local development against your own HIMERO instance:
  // endpoint: 'http://YOUR_LOCAL_IP:3000/api/ingest',
  // Note: use your machine's actual LAN IP, not 'localhost'
  // (localhost on a physical device refers to the device itself, not your Mac/PC)
})

function MainApp() {
  const handleError = () => {
    try {
      throw new Error('Test error from React Native')
    } catch (err) {
      HIMERO.captureError(err)
    }
  }

  return (
    <View>
      <Button title="Test Error" onPress={handleError} />
    </View>
  )
}

export default function App() {
  return (
    // HIMEROErrorBoundary catches component render crashes
    <HIMEROErrorBoundary>
      <MainApp />
    </HIMEROErrorBoundary>
  )
}
```

### Expo environment variables

```bash
# .env
EXPO_PUBLIC_HIMERO_API_KEY=himero_your_key
```

### Local development endpoint

When running Expo on a physical device, the device and your development machine must be on the same Wi-Fi network. `localhost` on a physical device refers to the device, not your Mac. Use your machine's LAN IP:

```ts
// Find your IP: run `ifconfig | grep "inet "` (macOS/Linux) or `ipconfig` (Windows)
endpoint: 'http://192.168.1.100:3000/api/ingest',
```

### What works in React Native

| Feature | Status |
|---|---|
| `HIMERO.captureError()` manual capture | ✅ |
| `HIMERO.captureMessage()` | ✅ |
| `HIMEROErrorBoundary` component crash capture | ✅ |
| `HIMERO.setUser()` / `setContext()` | ✅ |
| `HIMERO.addBreadcrumb()` manual breadcrumbs | ✅ |
| Automatic window.onerror | ❌ (no DOM in RN) |
| Automatic fetch interception | ❌ (use manual captureError in catch) |
| Automatic navigation breadcrumbs | ❌ (use manual addBreadcrumb) |

---

## 6. Node.js

Use `himero/node` for any Node.js server process. Automatic process-level handlers are installed:

| Event | Behaviour |
|---|---|
| `process.uncaughtException` | Captured as `critical`. SDK waits 500ms to flush the queue, then exits with code 1. |
| `process.unhandledRejection` | Captured as `error`. Process continues. |
| `process.warning` | Recorded as a `log` breadcrumb. |

```ts
// src/index.ts — top of your entry file, before any other imports
import HIMERO from 'himero/node'

HIMERO.init({
  apiKey:      process.env.HIMERO_API_KEY!,
  environment: process.env.NODE_ENV ?? 'production',
  release:     process.env.GIT_SHA,   // optional: tag errors to a specific deployment
  debug:       process.env.NODE_ENV !== 'production',
})

// Your application starts here
import('./server').then(({ start }) => start())
```

### Manual capture in async jobs

```ts
import HIMERO from 'himero/node'

async function processJob(jobId: string, payload: unknown) {
  try {
    await runJob(payload)
  } catch (err) {
    HIMERO.captureError(err, {
      level: 'critical',
      extra: { jobId, payloadType: typeof payload },
    })
    throw err  // re-throw so your job runner marks it as failed
  }
}
```

---

## 7. Express.js

Two middleware functions are provided:

| Middleware | Purpose | Position |
|---|---|---|
| `himeroRequestMiddleware(HIMERO)` | Adds each HTTP request as a breadcrumb | Before routes |
| `himeroErrorHandler(HIMERO)` | Captures unhandled errors thrown from routes | After all routes (last) |

```ts
// src/server.ts
import express from 'express'
import HIMERO from 'himero/node'
import { himeroRequestMiddleware, himeroErrorHandler } from 'himero/express'

HIMERO.init({ apiKey: process.env.HIMERO_API_KEY! })

const app = express()
app.use(express.json())

// ① Add request breadcrumbs — BEFORE your routes
app.use(himeroRequestMiddleware(HIMERO))

// ② Your routes
app.use('/api/users',    usersRouter)
app.use('/api/payments', paymentsRouter)

// ③ HIMERO error handler — LAST, after all routes
//    Express identifies error handlers by the 4-argument signature (err, req, res, next)
app.use(himeroErrorHandler(HIMERO))

app.listen(3000)
```

**What `himeroErrorHandler` captures**:
- Error type, message, and full stack trace
- HTTP method, URL, query string, and route parameters
- Request headers (with sensitive values redacted: `authorization`, `cookie`, `x-api-key`)

`himeroErrorHandler` calls `next(err)` after capturing, so Express continues to send its error response normally.

---

## 8. NestJS

`HIMEROExceptionFilter` implements `ExceptionFilter`. It:
- Captures HTTP **5xx** errors as HIMERO issues (actionable server bugs)
- Records HTTP **4xx** as breadcrumbs only (client errors — not server-side bugs)
- Handles HTTP, WebSocket, RPC, and GraphQL contexts
- Has **zero runtime dependency** on `@nestjs/common`

### Global filter (recommended)

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import HIMERO from 'himero/node'
import { HIMEROExceptionFilter } from 'himero/nestjs'

async function bootstrap() {
  HIMERO.init({
    apiKey:      process.env.HIMERO_API_KEY!,
    environment: process.env.NODE_ENV,
  })

  const app = await NestFactory.create(AppModule)
  app.useGlobalFilters(new HIMEROExceptionFilter(HIMERO))

  await app.listen(3000)
}
bootstrap()
```

### Per-controller filter

```ts
import { Controller, UseFilters } from '@nestjs/common'
import { HIMEROExceptionFilter } from 'himero/nestjs'
import HIMERO from 'himero/node'

@UseFilters(new HIMEROExceptionFilter(HIMERO))
@Controller('payments')
export class PaymentsController {
  // only errors from this controller are captured
}
```

---

## 9. Core API Reference

All methods are static on the `HIMERO` class, accessible from `import HIMERO from 'himero'`.

### `HIMERO.init(config)`

Initialises the SDK. Call once, as early as possible. Second call is a no-op unless `debug: true` (allows hot-reload reconfiguration in development).

```ts
HIMERO.init({
  apiKey:      'himero_xxx',   // required
  environment: 'production',
  debug:       false,
})
```

---

### `HIMERO.captureError(error, context?)`

Manually capture any thrown value. Accepts `Error`, `string`, `number`, or any object — non-Error values are wrapped automatically.

```ts
// Minimal
HIMERO.captureError(new Error('Something went wrong'))

// With full context
HIMERO.captureError(err, {
  level:  'critical',        // 'critical' | 'warning' | 'info' (default: inferred)
  userId: user.id,           // associate with a specific user
  extra:  {                  // any key-value pairs — sent to AI for diagnosis context
    orderId:   order.id,
    gateway:   'stripe',
    cartTotal: 99.99,
  },
})
```

---

### `HIMERO.captureMessage(message, level?, context?)`

Capture a plain string message as a synthetic error. Useful for tracking warning states and non-exception events.

```ts
HIMERO.captureMessage('Payment gateway timeout', 'critical', {
  extra: { gateway: 'stripe', latency_ms: 31000 },
})

HIMERO.captureMessage('Memory usage at 90%', 'warning')

HIMERO.captureMessage('New enterprise customer signed up', 'info', {
  extra: { plan: 'enterprise', mrr: 999 },
})
```

**Levels**: `'critical'` | `'warning'` | `'info'`

---

### `HIMERO.setUser(user | null)`

Associate all subsequent error reports with a specific user. Call after login, pass `null` after logout.

```ts
// On login
HIMERO.setUser({
  id:       user.id,        // string or number — required
  email:    user.email,     // optional
  username: user.username,  // optional
})

// On logout
HIMERO.setUser(null)
```

Once set, every `captureError` and `captureMessage` call automatically includes the user. The HIMERO dashboard shows "which users were affected" per error — critical for assessing impact.

---

### `HIMERO.setContext(key, value)`

Attach custom metadata to all subsequent error reports. Appears in the error detail view.

```ts
HIMERO.setContext('plan',        'enterprise')
HIMERO.setContext('org',         'acme-corp')
HIMERO.setContext('featureFlag', 'checkout-v2-enabled')
HIMERO.setContext('experiment',  'pricing-test-A')
```

---

### `HIMERO.addBreadcrumb(type, data)`

Manually add an event to the breadcrumb trail. Breadcrumbs are attached to the next captured error as timeline context.

```ts
HIMERO.addBreadcrumb('navigation', { from: '/cart', to: '/checkout' })
HIMERO.addBreadcrumb('click',      { element: 'button#pay', text: 'Pay Now' })
HIMERO.addBreadcrumb('custom',     { event: 'coupon.applied', code: 'SAVE20' })
HIMERO.addBreadcrumb('log',        { level: 'info', message: 'Cart validated' })
```

---

### `HIMERO.isInitialized`

`true` after `HIMERO.init()` has been called successfully.

```ts
if (!HIMERO.isInitialized) {
  HIMERO.init({ apiKey: process.env.HIMERO_API_KEY! })
}
```

---

## 10. Configuration Reference

All options for `HIMERO.init()`:

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | **required** | Your project API key from [himero.app/dashboard](https://himero.app/dashboard). Starts with `himero_`. |
| `environment` | `string` | `process.env.NODE_ENV` | Environment label shown in the dashboard. Useful for filtering `production` vs `staging` errors. |
| `release` | `string` | `undefined` | Git commit SHA or semver string. Links errors to a specific deployment for regression tracking. |
| `endpoint` | `string` | `https://himero.app/api/ingest` | Custom ingest URL. Use for self-hosted HIMERO or to proxy through your own backend. |
| `enabled` | `boolean` | `true` | Set `false` to completely disable the SDK (e.g., in test environments). |
| `debug` | `boolean` | `false` | Print all SDK activity to the console. Use during initial setup to verify configuration. |
| `sampleRate` | `number` | `1.0` | Fraction of errors to report (0.0–1.0). `0.1` = send 10% of errors. Useful for extremely high-volume apps. |
| `maxBreadcrumbs` | `number` | `50` | Circular buffer size. Oldest breadcrumbs are dropped when full. |
| `ignoreErrors` | `Array<string \| RegExp>` | `[]` | Drop errors matching any pattern (checked against both error type and message). |
| `ignoreUrls` | `Array<string \| RegExp>` | `[]` | Drop errors whose source file URL matches any pattern. |
| `beforeSend` | `(payload, hint) => payload \| null \| false` | `undefined` | Called before each event is sent. Return `null`/`false` to drop it; return the payload (modified or not) to send. |
| `beforeBreadcrumb` | `(crumb) => crumb \| null \| false` | `undefined` | Called before each breadcrumb is added. Return `null`/`false` to drop it. |

### `beforeSend` — filtering and scrubbing

```ts
HIMERO.init({
  apiKey: 'himero_xxx',
  beforeSend(payload, { originalError }) {
    // Drop errors from browser extensions
    if (payload.source_file?.startsWith('chrome-extension://')) return null
    if (payload.source_file?.startsWith('moz-extension://'))    return null

    // Drop health-check endpoint noise
    if (payload.url?.includes('/health')) return null
    if (payload.url?.includes('/_next/'))  return null

    // Scrub PII before it leaves the app
    payload.error_message = payload.error_message.replace(
      /[\w.+-]+@[\w-]+\.[a-z]+/gi,
      '[email redacted]',
    )

    return payload
  },
})
```

### `beforeBreadcrumb` — filtering noisy breadcrumbs

```ts
HIMERO.init({
  apiKey: 'himero_xxx',
  beforeBreadcrumb(crumb) {
    // Drop analytics pings — not useful for diagnosis
    if (crumb.type === 'fetch' && String(crumb.data?.url).includes('/analytics')) return null
    // Drop verbose console.log breadcrumbs
    if (crumb.type === 'log'   && crumb.data?.level === 'log') return null
    return crumb
  },
})
```

### Common `ignoreErrors` patterns

```ts
ignoreErrors: [
  // Browser quirks — not actionable
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  /^Loading chunk \d+ failed/,
  /^NetworkError/,
  /^Script error\.?$/,
  'Non-Error promise rejection captured with value: Object Not Found Matching Id',
  // React Native / Expo
  /^The network request failed/,
]
```

### Disabling in test / CI environments

```ts
HIMERO.init({
  apiKey:  process.env.HIMERO_API_KEY!,
  enabled: process.env.NODE_ENV !== 'test' && process.env.CI !== 'true',
})
```

---

## 11. Auto-Instrumentation Deep Dive

### Browser hooks (installed automatically when `window` is detected)

| Hook | Captured events | Notes |
|---|---|---|
| `window.onerror` | Synchronous JS errors (TypeError, ReferenceError, SyntaxError, etc.) | Includes source file, line, column |
| `window: unhandledrejection` | Unhandled Promise rejections | Works with async/await |
| `fetch` (monkey-patched) | All outgoing HTTP: URL, method, status, duration | Server errors (5xx) added as error breadcrumbs |
| `XMLHttpRequest` (monkey-patched) | Same as fetch, tagged `transport: xhr` | Legacy AJAX support |
| `console.error` / `console.warn` | Log breadcrumbs with exact message | Original console function still called |
| `history.pushState` / `replaceState` | Navigation breadcrumbs | SPA route changes |
| `popstate` / `hashchange` | Navigation breadcrumbs | Back/forward button presses |
| `document: click` (delegated) | Interaction breadcrumbs | Element tag + id/class + text content |

### Node.js hooks (installed automatically when `process.on` is detected)

| Event | Behaviour |
|---|---|
| `process.uncaughtException` | Captured as `critical`. SDK waits 500ms for queue to flush, then exits with code 1. |
| `process.unhandledRejection` | Captured as `error`. Process continues. |
| `process.warning` | Recorded as a `log` breadcrumb. Process continues. |

> **Next.js Edge Runtime**: `process` exists in Edge but `process.on` is not available. The SDK detects this automatically and skips Node.js integration — no crash, no warnings.

> **React Native / Expo**: `window` exists in Hermes (React Native's JS engine) but `window.location`, `window.history`, and `document` do not. The SDK detects `navigator.product === 'ReactNative'` and skips all browser instrumentation. No errors thrown.

### What is NOT captured automatically

- Errors inside `catch` blocks that you handle without re-throwing — use `HIMERO.captureError(err)` to also report them
- React component render errors in class components — use `HIMEROErrorBoundary`
- React Native navigation events — use `HIMERO.addBreadcrumb('navigation', { ... })` manually

---

## 12. Breadcrumbs Guide

Breadcrumbs are a chronological trail of events leading up to an error. When you view an error in HIMERO, the AI reads the breadcrumbs to understand exactly what the user was doing, what network requests were in-flight, and what the application state was — producing a dramatically more accurate diagnosis than a bare stack trace.

### Circular buffer

The SDK maintains a fixed-size buffer (default: 50). When full, the oldest breadcrumb is evicted. When an error is captured, the current buffer is snapshot and attached to the error report — you always get the most recent context.

### Automatic breadcrumb types

| Type | Source | Example data |
|---|---|---|
| `navigation` | Browser `pushState` / `popstate` | `{ from: '/cart', to: '/checkout' }` |
| `fetch` | Browser `fetch()` | `{ url, method, status: 200, duration: 142 }` |
| `fetch` | Browser `XMLHttpRequest` | `{ url, method, status: 500, transport: 'xhr' }` |
| `log` | `console.error` / `console.warn` | `{ level: 'error', message: '...' }` |
| `click` | DOM click events | `{ element: 'button#pay', text: 'Pay Now' }` |
| `log` | `process.warning` (Node.js) | `{ level: 'warning', message: '...' }` |

### Manual breadcrumbs

```ts
// Track business-domain events
HIMERO.addBreadcrumb('custom', {
  event:    'checkout.step_completed',
  step:     'payment_info',
  method:   'credit_card',
})

// Track a state change
HIMERO.addBreadcrumb('custom', {
  event:     'cart.coupon_applied',
  code:      'SAVE20',
  discount:  20,
})

// Track API calls (useful in React Native where fetch is not auto-instrumented)
HIMERO.addBreadcrumb('fetch', {
  url:      'https://api.stripe.com/v1/charges',
  method:   'POST',
  status:   402,
  duration: 850,
})
```

---

## 13. User Context & Custom Tags

### Pattern: Set user on login, clear on logout

```ts
import HIMERO from 'himero'

// After successful authentication
async function onLoginSuccess(session: Session) {
  HIMERO.setUser({
    id:       session.user.id,
    email:    session.user.email,
    username: session.user.username,
  })

  // Attach subscription context — visible in error detail view
  HIMERO.setContext('plan',  session.user.subscription.plan)  // 'free' | 'pro' | 'enterprise'
  HIMERO.setContext('org',   session.user.org.slug)
}

// After logout
async function onLogout() {
  await signOut()
  HIMERO.setUser(null)
}
```

### Why user context matters

The HIMERO dashboard shows per-error statistics: "affected users", "affected orgs", and "affected plans". When you set context, you can instantly answer:

- *"Is this bug only affecting free users, or also pro subscribers?"*
- *"Which specific customer is seeing this error?"*
- *"Is this a regression that started with today's deployment?"*

---

## 14. TypeScript Types

All public types are exported from the main entry:

```ts
import type {
  HIMEROConfig,       // HIMERO.init() options object
  HIMEROUser,         // HIMERO.setUser() argument
  CaptureContext,     // captureError() / captureMessage() second argument
  Breadcrumb,         // breadcrumb shape: { type, timestamp, data }
  BreadcrumbType,     // 'navigation' | 'fetch' | 'click' | 'log' | 'input' | 'custom'
  IngestPayload,      // full payload sent to POST /api/ingest
  ParsedStackFrame,   // { function, file, line, column, inApp }
} from 'himero'
```

### `IngestPayload` shape — what is sent to the HIMERO backend

```ts
interface IngestPayload {
  error_type:      string          // e.g., 'TypeError', 'Message[critical]'
  error_message:   string          // e.g., 'Cannot read property "id" of undefined'
  stack_trace:     string | null   // raw stack string
  source_file:     string | null   // top user-code frame file path
  source_line:     number | null   // line number
  source_column:   number | null   // column number
  source_snippet:  string | null   // code snippet around the error line (optional)
  url:             string | null   // page URL at time of error (browser only)
  user_agent:      string | null   // browser/device user agent
  session_id:      string          // stable session identifier
  user_id:         string | null   // from HIMERO.setUser()
  git_commit:      string | null   // from config.release
  environment:     string          // from config.environment
  breadcrumbs:     Breadcrumb[]    // snapshot of the breadcrumb buffer
}
```

---

## 15. Troubleshooting

### No errors appearing in the dashboard

**Step 1** — Add `debug: true` to `HIMERO.init()` and check the console for `[HIMERO] Initialized`. If not present, the SDK is not running.

**Step 2** — Verify the API key starts with `himero_` and matches a project in [himero.app/dashboard](https://himero.app/dashboard).

**Step 3** — Check `enabled` — if `enabled: process.env.NODE_ENV !== 'test'`, verify `NODE_ENV` is correctly set in your environment.

**Step 4** — Check `ignoreErrors` and `beforeSend` — an overly broad pattern or a hook returning `null` may be silently dropping all events.

**Step 5** — Check network requests in DevTools → Network tab. Look for `POST /api/ingest`. If it's failing, the response body will explain why (invalid key, Supabase misconfiguration, etc.).

### "SDK 연결 대기 중" (SDK waiting to connect) in HIMERO dashboard

The dashboard updates immediately when `HIMERO.init()` fires a ping. If it still shows "waiting":
- Verify `HIMERO_API_KEY` / `EXPO_PUBLIC_HIMERO_API_KEY` is set and non-empty
- Verify the `endpoint` is reachable from the device (on physical mobile devices, `localhost` does NOT work — use your machine's LAN IP)
- Check that the `sdk_connected_at` column exists on the `projects` table (run the latest Supabase migration)

### Expo / React Native: `Cannot read property 'href' of undefined`

This error occurs with himero **< 1.0.4**. Upgrade to the latest version:

```bash
npm install himero@latest
```

Since v1.0.4, the SDK detects `navigator.product === 'ReactNative'` and skips all browser DOM instrumentation.

### Next.js: `instrumentation.ts` is not running

- For Next.js < 15: add `experimental: { instrumentationHook: true }` to `next.config.ts`
- The file must be at the project root, not inside `src/` (unless `experimental.srcDir` is configured)
- Restart the dev server after creating the file — it is not hot-reloaded

### Express: errors from some routes are not captured

`himeroErrorHandler` must be registered **after** all routes. If it is registered before a route, errors from that route are not captured. Also ensure your error handler has exactly 4 parameters `(err, req, res, next)` — Express uses function arity to identify error handlers.

### Node.js: process exits before the error is flushed

Do not call `process.exit()` immediately after `HIMERO.captureError()`. The transport is async. Either await a brief delay, or let the SDK's `uncaughtException` handler manage the exit automatically (it waits 500ms before calling `process.exit(1)`).

---

## 16. License

This software is proprietary. You may freely install and use `himero` within your applications to connect to the HIMERO service. Redistribution, resale, or use to build a competing error monitoring product is not permitted.

See [LICENSE](./LICENSE) for full terms.

© 2026 HIMERO — [himero.app](https://himero.app)
