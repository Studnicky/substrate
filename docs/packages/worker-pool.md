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

## Usage

Composes `@studnicky/batch`, `@studnicky/system`, and `@studnicky/signal` into a bounded `node:worker_threads` pool. `run()` fans a list of work items across at most `concurrency` concurrently-running workers — each spawned fresh against `workerPath` and terminated once its item settles — and resolves an ordered results array. `concurrency` defaults to `System.optimalWorkerCount` when omitted:

<<< ../../packages/worker-pool/examples/observedWorkerPool.ts#usage

The worker entry script (`examples/observedWorkerPoolWorker.mjs` above) receives each item via a single `postMessage` and responds with the fixed discriminated-union envelope:

<!-- inline-ts-ok: type-only contract shape, not backed by a single runnable region — every variant is exercised piecemeal across the transcluded example and its .mjs worker fixture -->
```typescript
type WorkerEnvelopeType<TMessage, TResult> =
  | { type: 'log'; message: string }
  | { type: 'progress'; percent: number }
  | { type: 'result'; value: TResult }
  | { type: 'error'; error: string };
```

## Ordering and failure semantics

`run()` delegates its scheduling loop directly to `Batch#process()`, so it inherits that method's semantics: results resolve in the same order as the input `items`, and the first item to reject makes the whole `run()` call reject (`Promise.all`-like fail-fast, matching `Batch`'s own default). Items already in flight in the same concurrency batch are not aborted when a sibling rejects; only items in batches that have not started yet never spawn. A caller that needs every item's outcome regardless of individual failures should drive `WorkerPool` per-item itself rather than through `run()`.

## Spawn-per-item

Each call to `run()` spawns a fresh `Worker` per item and terminates it once that item settles, rather than keeping a warm pool of long-lived, reused worker threads. This keeps failure isolation simple: a worker that throws, hangs, or times out only ever affects the one item it was handling, with no state leaking into the next item on a reused thread. Total concurrent workers is still bounded at `concurrency` via `@studnicky/batch`.

| Method | Description |
|--------|-------------|
| `WorkerPool.create(config)` | Creates a pool. `config.workerPath` is required; `concurrency`, `timeoutMs`, and `signal` default |
| `WorkerPool.builder()` | Returns a `WorkerPoolBuilder` fluent builder |
| `run(items)` | Fans `items` across at most `concurrency` workers and resolves an ordered `TResult[]` |
| `getSignal()` | Returns the composed `Signal` instance |

## Hooks

| Hook | Fires |
|------|-------|
| `onMessage(envelope, index)` | For every envelope a worker posts back — `log`, `progress`, `result`, and `error` alike |
| `onWorkerTimeout(index)` | When a task exceeds its configured `timeoutMs`, immediately before the worker is terminated |
| `onWorkerError(error, index)` | When a task rejects — a `'error'` envelope, an uncaught worker `'error'` event, or an unexpected exit |

## Scope

`WorkerPool` is the generic worker-thread fan-out/collect kernel underneath two independently hand-rolled implementations found elsewhere in the wider project family — it owns only worker lifecycle, typed dispatch, bounded concurrency, and per-task timeout. It has no DAG/RPC request-routing semantics, no persistence, and no workflow-DSL; a consumer building a request/response protocol on top of the envelope contract layers that on top of `WorkerPool`, not inside it.

`WorkerPool` depends on `node:worker_threads` and is Node-specific, following the same precedent already set by `@studnicky/file-lock`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/worker-pool

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/worker-pool)
