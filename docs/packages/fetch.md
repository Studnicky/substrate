---
title: '@studnicky/fetch'
description: HTTP clients for Node.js and browsers with shared request contracts.
---

# @studnicky/fetch

> Make HTTP requests with Node and browser clients that share configuration and request contracts.

## Install

```bash
pnpm add @studnicky/fetch
```

## Choose a runtime

Import Node APIs from `@studnicky/fetch/node` and browser APIs from `@studnicky/fetch/browser`. Import shared types and JSON entities from `@studnicky/fetch/interfaces` and `@studnicky/fetch/entities`.

## Usage

<<< ../../packages/fetch/examples/01-client-config.ts#usage

`get`, `head`, `options`, and `delete` accept `FetchOptionsInterface`. `post`, `put`, and `patch` also accept a request body.

## Browser demo

<RunnableExample src="packages/fetch/examples/browserFetch" title="Live GET with browser fetch" />

## Customize requests

Subclass `FetchClient` and override `onRequest` to update the outgoing request context or `onResponse` to inspect or replace the response context.

<<< ../../packages/fetch/examples/02-override-hooks.ts#usage

## Configure and observe

Configure shared `baseURL`, headers, query parameters, timeouts, metadata, request IDs, and dispatcher settings with `FetchClient.create`. Timeouts use positive whole milliseconds. Use `UrlQueryString` to build and parse query strings. Override observer hooks to collect request timing, responses, errors, timeouts, and aborts.

<<< ../../packages/fetch/examples/observedFetch.ts#usage

## Entities

<!-- inline-ts-ok: published import path -->
```typescript
import { ClientConfigDataEntity, QueryParametersEntity } from '@studnicky/fetch/entities';
```

## Interfaces

<!-- inline-ts-ok: published import path -->
```typescript
import type { RequestIdGeneratorInterface } from '@studnicky/fetch/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `FetchClient` | Creates configured Node HTTP clients. | `@studnicky/fetch/node` |
| `UndiciDispatcher` | Manages a caller-owned undici connection pool. | `@studnicky/fetch/node` |
| `UrlQueryString` | Builds and parses URL query strings. | `@studnicky/fetch/node` |
| `DEFAULT_DISPATCHER_CONFIG` | Provides default connection-pool settings. | `@studnicky/fetch/node` |
| `AbortError` | Represents caller-aborted requests. | `@studnicky/fetch/node` |
| `BodyTimeoutError` | Represents response-body timeout failures. | `@studnicky/fetch/node` |
| `ConfigurationError` | Represents invalid fetch configuration. | `@studnicky/fetch/node` |
| `ConnectTimeoutError` | Represents connection timeout failures. | `@studnicky/fetch/node` |
| `FetchBaseError` | Base error for fetch failures. | `@studnicky/fetch/node` |
| `HeadersTimeoutError` | Represents response-header timeout failures. | `@studnicky/fetch/node` |
| `HTTPError` | Represents non-success HTTP responses. | `@studnicky/fetch/node` |
| `SocketError` | Represents socket failures. | `@studnicky/fetch/node` |
| `SocketExhaustionError` | Represents exhausted connection pools. | `@studnicky/fetch/node` |
| `TimeoutError` | Represents request timeout failures. | `@studnicky/fetch/node` |
| `BodyRequestOptionsInterface` | Defines options for body-bearing requests. | `@studnicky/fetch/interfaces` |
| `ClientConfigInterface` | Defines configured-client options. | `@studnicky/fetch/interfaces` |
| `FetchClientInterface` | Defines the client contract for composition. | `@studnicky/fetch/interfaces` |
| `FetchOptionsInterface` | Defines options for non-body requests. | `@studnicky/fetch/interfaces` |
| `QueryParametersEntity` | Validates JSON-safe URL query parameter data. | `@studnicky/fetch/entities` |
| `QueryParametersInterface` | Defines runtime URL query parameter values and `undefined` omission markers. | `@studnicky/fetch/interfaces` |
| `RequestContextInterface` | Defines the request lifecycle context. | `@studnicky/fetch/interfaces` |
| `RequestIdGeneratorInterface` | Defines the request-ID collaborator contract. | `@studnicky/fetch/interfaces` |
| `ResponseContextInterface` | Defines the response lifecycle context. | `@studnicky/fetch/interfaces` |
| `UndiciDispatcherInterface` | Defines the dispatcher lifecycle contract. | `@studnicky/fetch/interfaces` |
| `BrowserFetchClient` | Provides native browser fetch through the shared client contract. | `@studnicky/fetch/browser` |
| `FetchTransport` | Routes browser requests to native fetch. | `@studnicky/fetch/browser` |

## Observability hooks

Override observer hooks to collect request timing, responses, errors, timeouts, and aborts.

| Hook | When it fires |
|------|---------------|
| `onRequestStart` | Before sending a request |
| `onResponseSuccess` | After a successful response |
| `onResponseError` | After a non-success response |
| `onRequestError` | After a request failure |
| `onTimeout` | After a timeout |
| `onAbort` | After a caller abort |

<<< ../../packages/fetch/examples/observedFetch.ts#usage
