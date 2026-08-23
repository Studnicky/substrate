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

`@studnicky/fetch` exposes runtime APIs at its package root. It runs in browsers and Node: every request goes through the runtime's native `fetch`, and direct HTTP verb methods, override hooks, timeout handling, and URL utilities work in both. The undici connection-pool dispatcher is a Node-only enhancement enabled with `dispatcher: { enabled: true }`.

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
| `UrlQueryString` | Static helpers for building and parsing URLs |

## Entities

`@studnicky/fetch/entities` exports every schema namespace in `src/entities`, including client and dispatcher configuration, request and response metadata, events, and dispatcher health data.

```typescript
import { ClientConfigDataEntity } from '@studnicky/fetch/entities';
```

## Interfaces

`@studnicky/fetch/interfaces` exports every TypeScript contract in `src/interfaces`, including request, client, dispatcher, lifecycle-context, and validator contracts.

```typescript
import type { ValidatorCallbackInterface } from '@studnicky/fetch/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `FetchClient` | Creates configured HTTP clients. | `@studnicky/fetch` |
| `UndiciDispatcher` | Manages a caller-owned undici connection pool. | `@studnicky/fetch` |
| `UrlQueryString` | Builds and parses URL query strings. | `@studnicky/fetch` |
| `DEFAULT_DISPATCHER_CONFIG` | Provides default connection-pool settings. | `@studnicky/fetch` |
| `AbortError` | Represents caller-aborted requests. | `@studnicky/fetch` |
| `BodyTimeoutError` | Represents response-body timeout failures. | `@studnicky/fetch` |
| `ConfigurationError` | Represents invalid fetch configuration. | `@studnicky/fetch` |
| `ConnectTimeoutError` | Represents connection timeout failures. | `@studnicky/fetch` |
| `FetchBaseError` | Base error for fetch failures. | `@studnicky/fetch` |
| `HeadersTimeoutError` | Represents response-header timeout failures. | `@studnicky/fetch` |
| `HTTPError` | Represents non-success HTTP responses. | `@studnicky/fetch` |
| `SocketError` | Represents socket failures. | `@studnicky/fetch` |
| `SocketExhaustionError` | Represents exhausted connection pools. | `@studnicky/fetch` |
| `TimeoutError` | Represents request timeout failures. | `@studnicky/fetch` |
| `BodyRequestOptionsInterface` | Defines options for body-bearing requests. | `@studnicky/fetch` |
| `ClientConfigInterface` | Defines configured-client options. | `@studnicky/fetch` |
| `FetchClientInterface` | Defines the client contract for composition. | `@studnicky/fetch` |
| `FetchOptionsInterface` | Defines options for non-body requests. | `@studnicky/fetch` |
| `QueryParametersInterface` | Defines URL query parameter values. | `@studnicky/fetch` |
| `RequestContextInterface` | Defines the request lifecycle context. | `@studnicky/fetch` |
| `ResponseContextInterface` | Defines the response lifecycle context. | `@studnicky/fetch` |
| `UndiciDispatcherInterface` | Defines the dispatcher lifecycle contract. | `@studnicky/fetch` |

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
