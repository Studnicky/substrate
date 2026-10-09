---
title: "@studnicky/fetch"
description: HTTP clients for Node.js and browsers with shared request contracts.
---

# @studnicky/fetch

> Make HTTP requests with Node and browser clients that share configuration and request contracts.

## What it is

A composable HTTP-client primitive that provides runtime-specific transports, canonical request configuration, URL query handling, and lifecycle hooks. It gives consumers a boundary around platform fetch without defining their remote service or business flow.

## What it is for

Northstar Books uses it for catalogue availability reads, basket pricing calls, and browser-facing product queries with one request contract across runtimes. Consumers own URLs, authentication, retry composition, response interpretation, and the bookstore policies that decide what to do with a result.

## Northstar Books examples

The runnable browser-fetch example performs a live GET through the browser client, showing Northstar Books how a product-search screen can load a catalogue response through the shared request contract. It proves that the browser transport delegates to platform fetch while the caller retains the endpoint and response policy.

## Public entrypoints

| Import path                   | Use it when                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@studnicky/fetch/node`       | A Northstar Books server needs configured HTTP requests, URL queries, or a caller-owned connection pool. |
| `@studnicky/fetch/browser`    | A storefront browser needs the native-fetch implementation behind the shared client contract.            |
| `@studnicky/fetch/entities`   | An adapter validates the package's JSON-shaped request, response, query, and client-configuration data.  |
| `@studnicky/fetch/interfaces` | TypeScript composition shares HTTP client, request, response, query, and dispatcher contracts.           |
| `@studnicky/fetch/retry`      | A client needs HTTP-aware retry classification and backoff for failed requests.                          |

## Install

```bash
pnpm add @studnicky/fetch
```

## Choose a runtime

Import Node APIs from `@studnicky/fetch/node` and browser APIs from `@studnicky/fetch/browser`. Import shared types and JSON entities from `@studnicky/fetch/interfaces` and `@studnicky/fetch/entities`.

## Usage

A `FetchClient` starts life as a single configuration object — base URL, default headers, a timeout — shared by every request it makes afterward. This example builds one for Northstar's catalogue API once, bearer token and client name already baked in, so every `get`/`post`/`put` call that follows just supplies the path and anything genuinely request-specific:

<<< ../../packages/fetch/examples/01-client-config.ts#usage

`get`, `head`, `options`, and `delete` accept `FetchOptionsInterface`. `post`, `put`, and `patch` also accept a request body.

## Browser demo

The same client contract works unmodified in a browser. This demo swaps in `BrowserFetchClient`, points it at a stand-in `fetch` implementation, and performs a real GET for a single todo item, checking that the response status and parsed JSON body come back exactly as a storefront screen would expect:

<RunnableExample src="packages/fetch/examples/browserFetch" title="Live GET with browser fetch" />

## Compose a resilient Node request

A single `fetch` call is rarely resilient on its own — Northstar's supplier endpoint can flake for a request or two before it recovers, and one deadline still has to apply across every attempt, not reset on each retry. This recipe wires `FetchClient`, `Retry`, and `Signal` together by hand: `Signal.compose()` establishes that one deadline, `Retry.execute()` reissues the request against a server that deliberately fails twice before succeeding, and the assertions confirm it took exactly two retries to land one real 200. Because it needs an actual local HTTP server to fail against, this stays a Node-only source example rather than a browser runnable demo.

<<< ../../packages/fetch/examples/resilientRequestComposition.ts#usage

## Customize requests

Say every request from one client needs an `Authorization` header stamped on automatically — not something anyone wants to remember at every call site. This example subclasses `FetchClient`, overriding `onRequest` to add that header before the request goes out and `onResponse` to note the status code on the way back. The test server echoes the headers it actually received, so the assertions prove the header really arrived, not just that the override compiled.

<<< ../../packages/fetch/examples/02-override-hooks.ts#usage

## Configure and observe

Configure shared `baseURL`, headers, query parameters, timeouts, metadata, request IDs, and dispatcher settings with `FetchClient.create`. Timeouts use positive whole milliseconds. Use `UrlQueryString` to build and parse query strings.

Beyond configuring one client, it helps to see what it's actually doing on the wire — every request starting, every response landing, every failure. This example overrides both the request/response transform hooks and the observer hooks that fire around them, then drives one successful call and one that comes back 503, so the hook log shows exactly which events fired for each outcome:

<<< ../../packages/fetch/examples/observedFetch.ts#usage

## Entities

`ClientConfigDataEntity.intake` accepts JSON-shaped client configuration fields (`autoGenerateRequestId`, `baseURL`, pool `dispatcher` settings, headers, hook timeout, metadata, default options, and timeout), clones and normalizes them, and rejects invalid data. `FetchClient` translates a failed intake to `ConfigurationError`; query parameters use `QueryParametersEntity` at their own runtime boundary.

`QueryParametersEntity.intake` accepts JSON-safe query scalars and scalar arrays. `UrlQueryString` accepts `QueryParametersInterface`; `undefined` values are omitted while JSON values, including `null`, are serialized. `FetchClient.create({ parameters })` intakes configured parameters once and retains only their canonical JSON-safe representation.

`@studnicky/fetch/entities` exports the package's public schema namespaces, including client and dispatcher configuration, query parameters, request and response metadata, events, and dispatcher health data.

<!-- inline-ts-ok: published import path -->

```typescript
import { ClientConfigDataEntity, QueryParametersEntity } from "@studnicky/fetch/entities";
```

## Interfaces

<!-- inline-ts-ok: published import path -->

```typescript
import type { RequestIdGeneratorInterface } from "@studnicky/fetch/interfaces";
```

## Exports

| Symbol                        | Purpose                                                                                            | Import path                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| `FetchClient`                 | Creates configured Node HTTP clients.                                                              | `@studnicky/fetch/node`       |
| `UndiciDispatcher`            | Manages a caller-owned undici connection pool.                                                     | `@studnicky/fetch/node`       |
| `UrlQueryString`              | Builds and parses URL query strings.                                                               | `@studnicky/fetch/node`       |
| `DEFAULT_DISPATCHER_CONFIG`   | Provides default connection-pool settings.                                                         | `@studnicky/fetch/node`       |
| `AbortError`                  | Represents caller-aborted requests.                                                                | `@studnicky/fetch/node`       |
| `BodySerializationError`      | Represents a request body that cannot be serialized to JSON.                                       | `@studnicky/fetch/node`       |
| `BodyTimeoutError`            | Represents response-body timeout failures.                                                         | `@studnicky/fetch/node`       |
| `ConfigurationError`          | Represents invalid fetch configuration.                                                            | `@studnicky/fetch/node`       |
| `ConnectTimeoutError`         | Represents connection timeout failures.                                                            | `@studnicky/fetch/node`       |
| `ConstructionError`           | Represents a `create()` that did not construct the requested subclass.                             | `@studnicky/fetch/node`       |
| `DispatcherShutdownError`     | Represents a failed undici Agent `close()` or `destroy()`.                                         | `@studnicky/fetch/node`       |
| `FetchBaseError`              | Base error for fetch failures.                                                                     | `@studnicky/fetch/node`       |
| `HeadersTimeoutError`         | Represents response-header timeout failures.                                                       | `@studnicky/fetch/node`       |
| `HTTPError`                   | Represents non-success HTTP responses.                                                             | `@studnicky/fetch/node`       |
| `InvalidUrlError`             | Represents a URL that fails to parse in the fetch test dispatcher.                                 | `@studnicky/fetch/node`       |
| `QueryEncodingError`          | Represents query parameters that cannot be percent-encoded.                                        | `@studnicky/fetch/node`       |
| `RequestFailedError`          | Wraps a platform `fetch` failure (network `TypeError`, undici error) with the original as `cause`. | `@studnicky/fetch/node`       |
| `SocketError`                 | Represents socket failures.                                                                        | `@studnicky/fetch/node`       |
| `SocketExhaustionError`       | Represents exhausted connection pools.                                                             | `@studnicky/fetch/node`       |
| `TimeoutError`                | Represents request timeout failures.                                                               | `@studnicky/fetch/node`       |
| `BodyRequestOptionsInterface` | Defines options for body-bearing requests.                                                         | `@studnicky/fetch/interfaces` |
| `ClientConfigInterface`       | Defines configured-client options.                                                                 | `@studnicky/fetch/interfaces` |
| `FetchClientInterface`        | Defines the client contract for composition.                                                       | `@studnicky/fetch/interfaces` |
| `FetchOptionsInterface`       | Defines options for non-body requests.                                                             | `@studnicky/fetch/interfaces` |
| `QueryParametersEntity`       | Validates JSON-safe URL query parameter data.                                                      | `@studnicky/fetch/entities`   |
| `QueryParametersInterface`    | Defines runtime URL query parameter values and `undefined` omission markers.                       | `@studnicky/fetch/interfaces` |
| `RequestContextInterface`     | Defines the request lifecycle context.                                                             | `@studnicky/fetch/interfaces` |
| `RequestIdGeneratorInterface` | Defines the request-ID collaborator contract.                                                      | `@studnicky/fetch/interfaces` |
| `ResponseContextInterface`    | Defines the response lifecycle context.                                                            | `@studnicky/fetch/interfaces` |
| `UndiciDispatcherInterface`   | Defines the dispatcher lifecycle contract.                                                         | `@studnicky/fetch/interfaces` |
| `BrowserFetchClient`          | Provides native browser fetch through the shared client contract.                                  | `@studnicky/fetch/browser`    |
| `FetchTransport`              | Routes browser requests to native fetch.                                                           | `@studnicky/fetch/browser`    |

## Observability hooks

Each of these seven hooks fires around the network call itself rather than around the request/response transform: before the call starts, after a clean response, after a non-success response, after a request failure, after a timeout or abort, and before the client's dispatcher is destroyed. The `ObservedFetch` example above exercises this lifecycle in practice.

| Hook                  | When it fires                               |
| --------------------- | ------------------------------------------- |
| `onRequestStart`      | Before sending a request                    |
| `onResponseSuccess`   | After a successful response                 |
| `onResponseError`     | After a non-success response                |
| `onRequestError`      | After a request failure                     |
| `onTimeout`           | After a timeout                             |
| `onAbort`             | After a caller abort                        |
| `onDispatcherDestroy` | Before the client's dispatcher is destroyed |

<<< ../../packages/fetch/examples/observedFetch.ts#usage
