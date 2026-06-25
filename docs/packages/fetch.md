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
