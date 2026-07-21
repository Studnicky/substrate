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

`@studnicky/fetch` is the sole public code entrypoint. It runs in browsers and Node: every request goes through the runtime's native `fetch`, and direct HTTP verb methods, override hooks, timeout handling, and URL utilities work in both. The undici connection-pool dispatcher is a Node-only enhancement enabled with `dispatcher: { enabled: true }`.

`FetchClient` owns an enabled connection-pool Agent internally. Direct `UndiciDispatcher` use accepts a caller-owned `undici` `Agent`; retain that Agent for request dispatch and use `UndiciDispatcher` for health checks and lifecycle management.

## Try it

A real `GET` over native `fetch`, with override hooks and a timeout — press Run to watch it fetch live:

<RunnableExample src="packages/fetch/examples/browserFetch" title="Live GET over native fetch with override hooks" />

## Usage

<<< ../../packages/fetch/examples/01-client-config.ts#usage

### Request methods

`FetchClient.create(config?)` accepts shared `baseURL`, headers, query parameters, timeout, metadata, request-ID, fetch-option, hook-timeout, and dispatcher settings. Requests execute through the canonical verb methods:

| Methods | Options |
|---------|---------|
| `get`, `head`, `options`, `delete` | `FetchOptionsInterface` |
| `post`, `put`, `patch` | `BodyRequestOptionsInterface` with optional body serialization |

### Override hooks

`FetchClient` exposes two protected lifecycle hooks that subclasses override to transform the outgoing request or incoming response. These two hooks are in-band behavioral seams: they can mutate the request/response flow directly, and if they throw, the request fails through the normal error path.

| Hook | Signature | Purpose |
|------|-----------|---------|
| `onRequest` | `(context: RequestContextInterface): Promise<RequestContextInterface>` | Mutate `context.url`, `context.options`, or `context.metadata` before the request is sent |
| `onResponse` | `(context: ResponseContextInterface): Promise<ResponseContextInterface>` | Inspect or replace `context.response` after the raw response arrives |

`RequestContextInterface` carries `url`, `options`, and `metadata`. `ResponseContextInterface` carries `response` and `request`. The base implementations return the context unchanged; un-subclassed instances behave as if the hooks are absent.

<<< ../../packages/fetch/examples/02-override-hooks.ts#usage

### URL utilities

| Export | Purpose |
|--------|---------|
| `UrlUtils` | Static helpers for building and parsing URLs |

## Public API

The package root exports `FetchClient`, `UndiciDispatcher`, `UrlUtils`, `DEFAULT_DISPATCHER_CONFIG`, fetch error classes, dispatcher entities, `FetchRequestOptionsEntity`, `ClientConfigDataEntity`, and the package-owned request, response, configuration, query, body, fetch-option, client, and dispatcher interfaces. The request and client interfaces compose schema-expressible fields from those entities while retaining runtime-only headers, signals, dispatchers, metadata, and callbacks.

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
