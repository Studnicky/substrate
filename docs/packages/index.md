---
title: Packages
description: Workspace packages in the @studnicky/substrate monorepo.
---

# Packages

All packages are published under the `@studnicky` scope to the GitHub Package Registry.

```
@studnicky:registry=https://npm.pkg.github.com
```

## Public path contract

Packages publish their supported public entrypoints: `./node` and `./browser` runtime entrypoints, `./interfaces` for public substitution contracts, and `./entities` for canonical structured data where the package defines entities. Runtime entrypoints contain executable code; neutral contracts retain their own import paths. Construct stateful primitives through `Class.create(config)` and invoke their direct operation methods. Composition packages do not proxy dependency functionality; import dependency-owned contracts from that dependency's canonical public entrypoint.

See the [Composition Contract](/concepts/composition-contract) and
[Package Registry](/concepts/package-registry) for the workspace-wide rules and current
platform-parity status.

## Read each package page

Every package page uses the same reader contract: **What it is** identifies the primitive, **What it is for** names the consumer decision it supports, **Northstar Books examples** ties each runnable example to a bookstore problem, **Public entrypoints** lists every supported package and subpackage import path, and **Exports** names the symbols available from those paths. The pages describe building blocks that a bookstore composes into its own catalogue, checkout, fulfilment, and operations workflows; they do not prescribe a bookstore application.

## Concurrency

| Package                                         | Description                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| [@studnicky/concurrency](/packages/concurrency) | Keyed async channels, semaphore, and coalesce primitives              |
| [@studnicky/virtual-fs](/packages/virtual-fs)   | In-memory synchronous filesystem primitive with browser compatibility |
| [@studnicky/signal](/packages/signal)           | Instance-based AbortSignal composition and timeout utilities          |

## Time

| Package                                     | Description                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| [@studnicky/clock](/packages/clock)         | Wall-clock and monotonic time with injectable providers for deterministic testing |
| [@studnicky/scheduler](/packages/scheduler) | Real-time and virtual (min-heap) scheduler primitives                             |

## State & Flow

| Package                                             | Description                                                                                                                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [@studnicky/context](/packages/context)             | Per-request async context isolation using `AsyncLocalStorage`                                                                                                                                 |
| [@studnicky/fsm](/packages/fsm)                     | Abstract finite state machine base class with effect interpreter                                                                                                                              |
| [@studnicky/pipeline](/packages/pipeline)           | Generic typed async pipeline for sequential context transforms                                                                                                                                |
| [@studnicky/store](/packages/store)                 | Observable state container with interchangeable persistence, ordered cache, durable browser-state synchronization, and composable normalized entity collections via `@studnicky/store/entity` |
| [@studnicky/visible-range](/packages/visible-range) | Pure index/offset arithmetic for computing the visible item range of a virtualized list                                                                                                       |

## Data

| Package                                     | Description                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [@studnicky/cache](/packages/cache)         | LRU cache with optional TTL and capacity bounds                                                         |
| [@studnicky/json](/packages/json)           | JSON/object value-tools: deep merge, clone, equal, freeze, patch, hash, path, sort                      |
| [@studnicky/types](/packages/types)         | Shared runtime type guards, predicate composition, JSON boundaries, and Date/Map/Set operand validation |
| [@studnicky/drilldown](/packages/drilldown) | Deterministic multi-level grouping, faceting, and sorting over arbitrary record data                    |
| [@studnicky/filters](/packages/filters)     | Composable declarative filters with matching-score threshold adapters at the `matching` entrypoint      |
| [@studnicky/config](/packages/config)       | Configuration validation and clamping utilities                                                         |

## Matching & Routing

| Package                                   | Description                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [@studnicky/matching](/packages/matching) | Deterministic normalization, encoding, extraction, matching, scoring, and candidate-source primitives |

## I/O & Observability

| Package                                       | Description                                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [@studnicky/event-bus](/packages/event-bus)   | Publish/subscribe event bus with backpressure-aware queues                                                             |
| [@studnicky/fetch](/packages/fetch)           | Professional HTTP client with timeout, override hooks, and configured clients                                          |
| [@studnicky/logger](/packages/logger)         | Pluggable logging interface with Pino wrapper, child loggers, and structured metadata                                  |
| [@studnicky/errors](/packages/errors)         | Standardized error hierarchy serializing to RFC 9457 Problem Details                                                   |
| [@studnicky/resilience](/packages/resilience) | Retry/backoff, circuit breaker, token bucket, keyed and sliding-window rate limiters, and dead-letter queue primitives |

## Buffers

| Package                                                 | Description                                      |
| ------------------------------------------------------- | ------------------------------------------------ |
| [@studnicky/circular-buffer](/packages/circular-buffer) | Generic circular buffer with O(1) push and shift |

## Foundation

| Package                                             | Description                                         |
| --------------------------------------------------- | --------------------------------------------------- |
| [@studnicky/eslint-config](/packages/eslint-config) | Shared ESLint flat config for `@studnicky` packages |
| [@studnicky/entity](/packages/entity)               | Strict entity input compilation and cycle detection |
