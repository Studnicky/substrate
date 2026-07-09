---
title: '@studnicky/fetch'
description: HTTP client with timeout, override hooks, and configured clients.
---

# @studnicky/fetch

> HTTP client with timeout, override hooks, and configured clients for Node.js.

## Install

```bash
pnpm add @studnicky/fetch
```

`@studnicky/fetch` runs in the browser and Node alike: every request goes through the runtime's native `fetch`, and the override hook pipeline, timeout, request builder, and URL utilities work in both. The undici connection-pool dispatcher (socket pools, HTTP/1.1 keep-alive) is a **Node-only enhancement** — disabled by default and enabled with `dispatcher: { enabled: true }`. In the browser, native `fetch` handles connection management, so enabling the undici dispatcher there throws a clear error.

## Try it

A real `GET` over native `fetch`, with override hooks and a timeout — press Run to watch it fetch live:

<RunnableExample src="packages/fetch/examples/browserFetch" title="Live GET over native fetch with override hooks" />

## Usage

<<< ../../packages/fetch/examples/01-client-config.ts#usage

### Override hooks

`FetchClient` exposes two protected lifecycle hooks that subclasses override to transform the outgoing request or incoming response. These two hooks are in-band behavioral seams: they can mutate the request/response flow directly, and if they throw, the request fails through the normal error path.

| Hook | Signature | Purpose |
|------|-----------|---------|
| `onRequest` | `(context: RequestContextType): Promise<RequestContextType>` | Mutate `context.url`, `context.options`, or `context.metadata` before the request is sent |
| `onResponse` | `(context: ResponseContextType): Promise<ResponseContextType>` | Inspect or replace `context.response` after the raw response arrives |

`RequestContextType` carries `url`, `options`, and `metadata`. `ResponseContextType` carries `response` and `request`. The base implementations return the context unchanged; un-subclassed instances behave as if the hooks are absent.

<<< ../../packages/fetch/examples/02-override-hooks.ts#usage

### URL utilities

| Export | Purpose |
|--------|---------|
| `UrlUtils` | Static helpers for building and parsing URLs |

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/fetch` | `FetchClient`, `HttpMethods`, `RequestBuilder`, `UndiciDispatcher`, `UrlUtils`, all error classes |
| `@studnicky/fetch/constants` | `DEFAULT_DISPATCHER_CONFIG` |
| `@studnicky/fetch/errors` | `HTTPError`, `TimeoutError`, `NetworkError`, `AbortError`, and more |
| `@studnicky/fetch/interfaces` | All interface types |
| `@studnicky/fetch/modules` | Module re-exports |
| `@studnicky/fetch/types` | `QueryParamsType`, `RequestContextType`, `ResponseContextType` |

## Observability hooks

Override any protected observer hook to add logging, metrics, or tracing without modifying core behavior. These hooks are observational; they do not replace the request result or the canonical request error path.

| Hook | When it fires | Args |
|------|--------------|------|
| `onRequestStart` | Before the request is sent | `method, path, requestId, url` |
| `onResponseSuccess` | HTTP 2xx response received | `method, requestId, statusCode, durationMs` |
| `onResponseError` | HTTP non-2xx response received | `method, requestId, statusCode, durationMs` |
| `onRequestError` | Network-level error (connect fail, etc.) | `error, method, requestId, url, durationMs` |
| `onTimeout` | Request aborted by timeout | `method, requestId, url, timeoutMs` |
| `onAbort` | Request aborted by caller | `method, requestId, url` |
| `onDispatcherDestroy` | Dispatcher is about to be destroyed | _(none)_ |

<<< ../../packages/fetch/examples/observedFetch.ts#usage

The base class never calls any logger or metrics library. Observer hooks are no-ops by default; `onRequest` and `onResponse` are the in-band transform seams.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/fetch)
