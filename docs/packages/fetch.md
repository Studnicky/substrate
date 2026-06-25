---
title: '@studnicky/fetch'
description: HTTP client with timeout, interceptors, and configured clients.
---

# @studnicky/fetch

> HTTP client with timeout, interceptors, and configured clients for Node.js.

## Install

```bash
pnpm add @studnicky/fetch
```

`@studnicky/fetch` runs in the browser and Node alike: every request goes through the runtime's native `fetch`, and the interceptor pipeline, timeout, request builder, and URL utilities work in both. The undici connection-pool dispatcher (socket pools, HTTP/1.1 keep-alive) is a **Node-only enhancement** — disabled by default and enabled with `dispatcher: { enabled: true }`. In the browser, native `fetch` handles connection management, so enabling the undici dispatcher there throws a clear error.

## Try it

A real `GET` over native `fetch`, with a request/response interceptor pipeline and a timeout — press Run to watch it fetch live:

<RunnableExample src="packages/fetch/examples/browserFetch" title="Live GET over native fetch with interceptors" />

## Usage

<<< ../../packages/fetch/examples/01-client-config.ts#usage

### Interceptors

<<< ../../packages/fetch/examples/02-interceptors.ts#usage

### URL utilities

| Export | Purpose |
|--------|---------|
| `UrlUtils` | Static helpers for building and parsing URLs |

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/fetch` | `FetchClient`, `HttpMethods`, `InterceptorManager`, `RequestBuilder`, `UndiciDispatcher`, `UrlUtils`, all error classes |
| `@studnicky/fetch/constants` | `DefaultDispatcherConfig` |
| `@studnicky/fetch/errors` | `HTTPError`, `TimeoutError`, `NetworkError`, `AbortError`, and more |
| `@studnicky/fetch/interfaces` | All interface types |
| `@studnicky/fetch/modules` | Module re-exports |
| `@studnicky/fetch/types` | `QueryParamsType`, `RequestInterceptorType`, `ResponseInterceptorType` |

## Observability hooks

Override any protected hook to add logging, metrics, or tracing without modifying core behavior.

| Hook | When it fires | Args |
|------|--------------|------|
| `onRequestStart` | Before the request is sent | `method, path, requestId, url` |
| `onResponseSuccess` | HTTP 2xx response received | `method, requestId, statusCode, durationMs` |
| `onResponseError` | HTTP non-2xx response received | `method, requestId, statusCode, durationMs` |
| `onRequestError` | Network-level error (connect fail, etc.) | `error, method, requestId, url, durationMs` |
| `onTimeout` | Request aborted by timeout | `method, requestId, url, timeoutMs` |
| `onAbort` | Request aborted by caller | `method, requestId, url` |
| `onRequestIntercept` | After each request interceptor stage | `index, context` |
| `onResponseIntercept` | After each response interceptor stage | `index, context` |
| `onDispatcherDestroy` | Dispatcher is about to be destroyed | _(none)_ |

<<< ../../packages/fetch/examples/observedFetch.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/fetch)
