---
title: '@studnicky/fetch'
description: Professional HTTP client with timeout, interceptors, and configured clients.
---

# @studnicky/fetch

> Professional HTTP client with timeout, interceptors, and configured clients for Node.js.

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

## Extending

`FetchClient` exposes protected lifecycle hooks — `onRequestStart`, `onResponseSuccess`, `onRequestError` — that subclasses override to add telemetry without modifying core behavior.

<<< ../../packages/fetch/examples/03-telemetry-hooks.ts#usage

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/fetch)
