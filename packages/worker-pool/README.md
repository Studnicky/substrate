# @studnicky/worker-pool

> Portable worker leases with Node worker-thread and Web Worker pool adapters

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/worker-pool)

Composes `@studnicky/batch`, `@studnicky/system`, and `@studnicky/signal` into a bounded `node:worker_threads` pool. `run()` fans a list of work items across at most `concurrency` concurrently-running workers, admits up to `batchConcurrency` items into each `Batch#process()` scheduling window, reuses each worker for later items in that run, terminates the live workers after dispatched work settles, and resolves an ordered results array. Every envelope a worker posts back (`log`, `progress`, `result`, `error`) fires `onMessage()`; a `'result'` envelope resolves that item, while an `'error'` envelope, an uncaught worker error, a repeated unexpected mid-task exit, or exceeding `timeoutMs` rejects it.

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
import { WorkerPool } from '@studnicky/worker-pool/node';

const pool = WorkerPool.create({
  workerPath: fileURLToPath(new URL('./worker.mjs', import.meta.url)),
  concurrency: 4,
  timeoutMs: 5000
});

const results = await pool.run([1, 2, 3, 4, 5]);
```

`concurrency` defaults to `System.optimalWorkerCount` (logical CPU count minus one) when omitted. `batchConcurrency` defaults to `concurrency`; set it higher only when callers intentionally want a wider admission window than the worker count. `timeoutMs` is optional — omit it for no per-task timeout.

For each dispatched task, the pool awaits `signal.compose({ deadlineMs: timeoutMs, signal: abortSignal })` before posting the item to its worker. `signal` is the portable `Signal` primitive; `abortSignal` is an optional caller cancellation source. Signal hooks and composition failures therefore settle before task execution begins, while queued time remains outside the per-task deadline.

The worker entry script receives each item via a single `postMessage` and responds with one of four interfaces from `@studnicky/worker-pool/interfaces`: `WorkerLogEnvelopeInterface`, `WorkerProgressEnvelopeInterface`, `WorkerResultEnvelopeInterface<TResult>`, or `WorkerErrorEnvelopeInterface`. Their `type` discriminants are `log`, `progress`, `result`, and `error`, respectively.

Schema-backed configuration, envelope, lifecycle, and task values are available from `@studnicky/worker-pool/entities`. Type-only worker contracts are available from `@studnicky/worker-pool/interfaces`.

## Ordering and failure semantics

`run()` delegates its scheduling loop directly to `Batch#process()`, so it inherits that method's semantics:

- **Order preserved.** Results resolve in the same order as the input `items`, regardless of which worker finishes first.
- **Fail-fast.** The first item to reject makes the whole `run()` call reject — `Promise.all`-like, matching `Batch`'s own default (`process()`, not `processSettled()`). Items already in flight in the same concurrency batch are not aborted when a sibling rejects; only items in batches that have not started yet never spawn. A caller that needs every item's outcome regardless of individual failures should drive `WorkerPool` per-item itself rather than through `run()`.

An unexpected worker exit during a task retries that item once on a freshly spawned replacement worker. A second unexpected mid-task exit rejects the item.

## Per-run worker reuse and teardown

Each call to `run()` creates its own pool of at most `concurrency` workers. An idle worker receives the next queued item in that run; workers are not retained across separate `run()` calls. After the dispatched task promises settle, `run()` terminates every live worker and waits for those termination attempts before it resolves or rejects.

## API reference

| Method | Description |
|--------|-------------|
| `WorkerPool.create(config)` | Creates a pool. `config.workerPath` is required; `concurrency`, `batchConcurrency`, `timeoutMs`, and `signal` default |
| `run(items)` | Fans `items` across at most `concurrency` workers and resolves an ordered `TResult[]` |
| `getHookErrorCount()` | Count of hook failures recorded since construction |
| `getHookErrors()` | Detached errors and nested causes for every hook failure recorded since construction |

## Hooks

`WorkerPool` has no observability of its own by default — override these protected hooks in a subclass to add logging/tracing/metrics. Hooks should stay fast and non-blocking; observer-hook failures are contained so worker execution still resolves or rejects through the canonical task outcome.

| Hook | Fires |
|------|-------|
| `onMessage(envelope, index)` | For every envelope a worker posts back — `log`, `progress`, `result`, and `error` alike |
| `onWorkerTimeout(index)` | When a task exceeds its configured `timeoutMs`, immediately before the worker is terminated |
| `onWorkerError(error, index)` | When a worker reports an error envelope, emits an uncaught error, or termination fails |

A hook override that throws or rejects does not abort a worker's task settlement — the failure is recorded instead of propagating, backed internally by `@studnicky/errors`'s `HookInvoker`. Inspect recorded failures via `getHookErrorCount()`/`getHookErrors()`.

```typescript
import type {
  WorkerErrorEnvelopeInterface,
  WorkerLogEnvelopeInterface,
  WorkerProgressEnvelopeInterface,
  WorkerResultEnvelopeInterface
} from '@studnicky/worker-pool/interfaces';

import { WorkerPool } from '@studnicky/worker-pool/node';

class TelemetryWorkerPool extends WorkerPool<{ n: number }, number> {
  protected override onMessage(
    envelope:
      | WorkerErrorEnvelopeInterface
      | WorkerLogEnvelopeInterface
      | WorkerProgressEnvelopeInterface
      | WorkerResultEnvelopeInterface<number>,
    index: number
  ): void {
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
  workerPath: fileURLToPath(new URL('./worker.mjs', import.meta.url))
});

const results = await pool.run([{ n: 5 }, { n: 10 }, { n: 15 }]);
```

See `examples/observedWorkerPool.ts` and its worker fixture `examples/observedWorkerPoolWorker.mjs` for the full runnable version.

## Scope

`WorkerPool` is the generic worker-thread fan-out/collect kernel underneath two independently hand-rolled implementations found elsewhere in the wider project family — it owns only worker lifecycle, typed dispatch, bounded concurrency, and per-task timeout. It has no DAG/RPC request-routing semantics, no persistence, and no workflow-DSL; a consumer building a request/response protocol on top of the envelope contract (routing, correlation IDs, retries per message type) layers that on top of `WorkerPool`, not inside it.

## Runtime entrypoints

`WorkerPool` is available from `@studnicky/worker-pool/node` and uses `node:worker_threads`.
`WebWorkerPool` is available from `@studnicky/worker-pool/browser` and uses native Web Workers.
Both implement `WorkerPoolInterface` and use the same `Signal`, `abortSignal`, `timeoutMs`, `run()`,
and `close()` semantics.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/worker-pool

## License

MIT
