---
title: '@studnicky/worker-pool'
description: Bounded node:worker_threads pool that fans work items across workers with a typed message envelope and per-task timeout.
---

# @studnicky/worker-pool

> Bounded node:worker_threads pool that fans work items across workers with a typed message envelope and per-task timeout.

## Install

```bash
pnpm add @studnicky/worker-pool
```

`@studnicky/worker-pool` exposes a runtime entrypoint plus explicit entity and interface subpaths.

::: info Live demo unavailable
In-browser execution of this package is not supported. `run()` spawns real `node:worker_threads` workers, which browsers do not provide. The example below is shown statically.
:::

## Usage

Composes `@studnicky/batch`, `@studnicky/system`, and `@studnicky/signal` into a bounded `node:worker_threads` pool. `run()` fans a list of work items across at most `concurrency` concurrently-running workers, admits up to `batchConcurrency` items into each `Batch#process()` scheduling window, reuses them for later items in that run, terminates the live workers after dispatched work settles, and resolves an ordered results array. `concurrency` defaults to `System.optimalWorkerCount` when omitted, and `batchConcurrency` defaults to `concurrency`:

<<< ../../packages/worker-pool/examples/observedWorkerPool.ts#usage

The worker entry script (`examples/observedWorkerPoolWorker.mjs` above) receives each item via a single `postMessage` and responds with one of four interfaces from `@studnicky/worker-pool/interfaces`: `WorkerLogEnvelopeInterface`, `WorkerProgressEnvelopeInterface`, `WorkerResultEnvelopeInterface<TResult>`, or `WorkerErrorEnvelopeInterface`. Their `type` discriminants are `log`, `progress`, `result`, and `error`, respectively.

## Ordering and failure semantics

`run()` delegates its scheduling loop directly to `Batch#process()`, so it inherits that method's semantics: results resolve in the same order as the input `items`, and the first item to reject makes the whole `run()` call reject (`Promise.all`-like fail-fast, matching `Batch`'s own default). Items already in flight in the same concurrency batch are not aborted when a sibling rejects; only items in batches that have not started yet never spawn. A caller that needs every item's outcome regardless of individual failures should drive `WorkerPool` per-item itself rather than through `run()`.

An unexpected worker exit during a task retries that item once on a freshly spawned replacement worker. A second unexpected mid-task exit rejects the item.

## Per-run worker reuse and teardown

Each call to `run()` creates its own pool of at most `concurrency` workers. An idle worker receives the next queued item in that run; workers are not retained across separate `run()` calls. After the dispatched task promises settle, `run()` terminates every live worker and waits for those termination attempts before it resolves or rejects.

| Method | Description |
|--------|-------------|
| `WorkerPool.create(config)` | Creates a pool. `config.workerPath` is required; `concurrency`, `batchConcurrency`, `timeoutMs`, and `signal` default |
| `run(items)` | Fans `items` across at most `concurrency` workers and resolves an ordered `TResult[]` |
| `getHookErrorCount()` | Count of hook failures recorded since construction |
| `getHookErrors()` | Defensive copy of every hook failure recorded since construction |

## Hooks

| Hook | Fires |
|------|-------|
| `onMessage(envelope, index)` | For every envelope a worker posts back — `log`, `progress`, `result`, and `error` alike |
| `onWorkerTimeout(index)` | When a task exceeds its configured `timeoutMs`, immediately before the worker is terminated |
| `onWorkerError(error, index)` | When a worker reports an error envelope, emits an uncaught error, or termination fails |

A hook override that throws or rejects does not abort a worker's task settlement — the failure is recorded instead of propagating; inspect it via `getHookErrorCount()` (a running total) and `getHookErrors()` (a defensive copy of every recorded failure), backed internally by `@studnicky/errors`'s `HookInvoker`.

## Entities

`@studnicky/worker-pool/entities` exports every schema namespace in `src/entities`, including worker-pool configuration, worker envelopes, task state, and lifecycle state, event, and effect values.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import { WorkerPoolConfigEntity } from '@studnicky/worker-pool/entities';
```

## Interfaces

`@studnicky/worker-pool/interfaces` exports every TypeScript interface in `src/interfaces`, including the envelope contracts used by worker entry scripts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import type { WorkerResultEnvelopeInterface } from '@studnicky/worker-pool/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `WorkerPool` | Creates a bounded Node.js worker-thread pool. | `@studnicky/worker-pool` |
| `WorkerPoolConfigInterface` | Defines the configuration passed to `WorkerPool.create`. | `@studnicky/worker-pool` |
| `WorkerPoolError` | Represents worker-pool configuration and lifecycle failures. | `@studnicky/worker-pool` |
| `WorkerFactoryInterface` | Defines worker creation, initialization, observation, and termination. | `@studnicky/worker-pool` |
| `WorkerLeaseInterface` | Defines an active leased worker and caller-owned request transport. | `@studnicky/worker-pool` |
| `WorkerLeasePool` | Provides reusable, bounded worker leases. | `@studnicky/worker-pool` |
| `WorkerLeasePoolOptionsInterface` | Defines the factory and lease limit for `WorkerLeasePool`. | `@studnicky/worker-pool` |
| `WorkerObservationInterface` | Defines liveness observation and observer cleanup. | `@studnicky/worker-pool` |
| `WorkerTransportInterface` | Defines one caller-owned request/response transport. | `@studnicky/worker-pool` |

## Scope

`WorkerPool` is the generic worker-thread fan-out/collect kernel underneath two independently hand-rolled implementations found elsewhere in the wider project family — it owns only worker lifecycle, typed dispatch, bounded concurrency, and per-task timeout. It has no DAG/RPC request-routing semantics, no persistence, and no workflow-DSL; a consumer building a request/response protocol on top of the envelope contract layers that on top of `WorkerPool`, not inside it.

`WorkerPool` depends on `node:worker_threads` and is Node-specific, following the same precedent already set by `@studnicky/file-lock`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/worker-pool

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/worker-pool)
