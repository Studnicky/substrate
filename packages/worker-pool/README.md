# @studnicky/worker-pool

> Bounded `node:worker_threads` pool that fans work items across workers with a typed message envelope and per-task timeout

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/worker-pool)

Composes `@studnicky/batch`, `@studnicky/system`, and `@studnicky/signal` into a bounded `node:worker_threads` pool. `run()` fans a list of work items across at most `concurrency` concurrently-running workers — each spawned fresh against `workerPath` and terminated once its item settles — and resolves an ordered results array. Every envelope a worker posts back (`log`, `progress`, `result`, `error`) fires `onMessage()`; a `'result'` envelope resolves that item, and a `'error'` envelope, an uncaught worker error, an unexpected exit, or exceeding `timeoutMs` all reject it.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/worker-pool
```

## Usage

```typescript
import { WorkerPool } from '@studnicky/worker-pool';

const pool = WorkerPool.create({
  workerPath: new URL('./worker.mjs', import.meta.url).pathname,
  concurrency: 4,
  timeoutMs: 5000
});

const results = await pool.run([1, 2, 3, 4, 5]);
```

`concurrency` defaults to `System.optimalWorkerCount` (logical CPU count minus one) when omitted. `timeoutMs` is optional — omit it for no per-task timeout.

The worker entry script receives each item via a single `postMessage` and responds with the fixed discriminated-union envelope:

```typescript
type WorkerEnvelopeType<TMessage, TResult> =
  | { type: 'log'; message: string }
  | { type: 'progress'; percent: number }
  | { type: 'result'; value: TResult }
  | { type: 'error'; error: string };
```

## Ordering and failure semantics

`run()` delegates its scheduling loop directly to `Batch#process()`, so it inherits that method's semantics:

- **Order preserved.** Results resolve in the same order as the input `items`, regardless of which worker finishes first.
- **Fail-fast.** The first item to reject makes the whole `run()` call reject — `Promise.all`-like, matching `Batch`'s own default (`process()`, not `processSettled()`). Items already in flight in the same concurrency batch are not aborted when a sibling rejects; only items in batches that have not started yet never spawn. A caller that needs every item's outcome regardless of individual failures should drive `WorkerPool` per-item itself rather than through `run()`.

## Spawn-per-item, not a reused worker pool

Each call to `run()` spawns a fresh `Worker` per item and terminates it once that item settles — `WorkerPool` does not keep a warm pool of long-lived, reused worker threads. This keeps failure isolation simple: a worker that throws, hangs, or times out only ever affects the one item it was handling, with no risk of state leaking into the next item on a reused thread. Total concurrent workers is still bounded at `concurrency` via `@studnicky/batch`.

## API reference

| Method | Description |
|--------|-------------|
| `WorkerPool.create(config)` | Creates a pool. `config.workerPath` is required; `concurrency`, `timeoutMs`, and `signal` default |
| `WorkerPool.builder()` | Returns a `WorkerPoolBuilder` fluent builder |
| `run(items)` | Fans `items` across at most `concurrency` workers and resolves an ordered `TResult[]` |
| `getSignal()` | Returns the composed `Signal` instance |

## Hooks

`WorkerPool` has no observability of its own by default — override these protected hooks in a subclass to add logging/tracing/metrics. Hooks should stay fast and non-blocking; observer-hook failures are contained so worker execution still resolves or rejects through the canonical task outcome.

| Hook | Fires |
|------|-------|
| `onMessage(envelope, index)` | For every envelope a worker posts back — `log`, `progress`, `result`, and `error` alike |
| `onWorkerTimeout(index)` | When a task exceeds its configured `timeoutMs`, immediately before the worker is terminated |
| `onWorkerError(error, index)` | When a task rejects — a `'error'` envelope, an uncaught worker `'error'` event, or an unexpected exit |

```typescript
import { WorkerPool } from '@studnicky/worker-pool';

class TelemetryWorkerPool extends WorkerPool<{ n: number }, number> {
  protected override onMessage(envelope: WorkerEnvelopeType<{ n: number }, number>, index: number): void {
    if (envelope.type === 'log') {
      console.log(`[worker ${index}] ${envelope.message}`);
    }
  }

  protected override onWorkerError(error: Error, index: number): void {
    console.error(`[worker ${index}] failed:`, error.message);
  }
}

const pool = TelemetryWorkerPool.create({
  concurrency: 2,
  workerPath: new URL('./worker.mjs', import.meta.url).pathname
}) as TelemetryWorkerPool;

const results = await pool.run([{ n: 5 }, { n: 10 }, { n: 15 }]);
```

See `examples/observedWorkerPool.ts` and its worker fixture `examples/observedWorkerPoolWorker.mjs` for the full runnable version.

## Scope

`WorkerPool` is the generic worker-thread fan-out/collect kernel underneath two independently hand-rolled implementations found elsewhere in the wider project family — it owns only worker lifecycle, typed dispatch, bounded concurrency, and per-task timeout. It has no DAG/RPC request-routing semantics, no persistence, and no workflow-DSL; a consumer building a request/response protocol on top of the envelope contract (routing, correlation IDs, retries per message type) layers that on top of `WorkerPool`, not inside it.

## Node-only

`WorkerPool` depends on `node:worker_threads` and is Node-specific, following the same precedent already set by `@studnicky/file-lock` — not every substrate package is framework/runtime-agnostic, and this one intentionally is not.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/worker-pool

## License

MIT
