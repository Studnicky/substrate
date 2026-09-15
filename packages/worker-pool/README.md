# @studnicky/worker-pool

> Portable worker leases with Node worker-thread and Web Worker pool adapters

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/worker-pool)

Run work concurrently through Node worker threads or browser Web Workers. Configure a worker path and concurrency, then call `run(items)` for ordered results.

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

`concurrency` limits active workers. `batchConcurrency` controls queued-work admission, and `timeoutMs` limits each task.

Pass `abortSignal` to cancel a task. Pass `signal` when your application supplies a `Signal` implementation.

Workers post `log`, `progress`, `result`, and `error` envelopes. Import message entities from `@studnicky/worker-pool/entities` and generic message contracts from `@studnicky/worker-pool/interfaces`.

Use the entity and interfaces subpaths for worker configuration, envelopes, and shared contracts.

## Ordering and failure semantics

`run()` preserves input order and rejects if an item fails. An unexpected worker exit receives one replacement attempt.

- **Order preserved.** Results resolve in the same order as the input `items`, regardless of which worker finishes first.
- **Fail-fast.** The first item error rejects `run()`. Items already running continue to settle.

Each `run()` call uses up to `concurrency` workers and closes them after the call settles.

## Per-run worker reuse and teardown

Each `run()` call uses up to `concurrency` workers and closes them after the call settles.

## API reference

| Method | Description |
|--------|-------------|
| `WorkerPool.create(config)` | Creates a pool. `config.workerPath` is required; `concurrency`, `batchConcurrency`, `timeoutMs`, and `signal` default |
| `run(items)` | Fans `items` across at most `concurrency` workers and resolves an ordered `TResult[]` |
| `getHookErrorCount()` | Count of hook failures recorded since construction |
| `getHookErrors()` | Detached errors and nested causes for every hook failure recorded since construction |

## Hooks

Override these protected hooks to collect logging, tracing, or metrics.

| Hook | Fires |
|------|-------|
| `onMessage(envelope, index)` | For every envelope a worker posts back — `log`, `progress`, `result`, and `error` alike |
| `onWorkerTimeout(index)` | When a task exceeds its configured `timeoutMs`, immediately before the worker is terminated |
| `onWorkerError(error, index)` | When a worker reports an error envelope, emits an uncaught error, or termination fails |

Use `getHookErrorCount()` and `getHookErrors()` to inspect hook failures.

```typescript
import type {
  WorkerErrorEnvelopeEntity,
  WorkerLogEnvelopeEntity,
  WorkerProgressEnvelopeEntity
} from '@studnicky/worker-pool/entities';
import type { WorkerResultEnvelopeInterface } from '@studnicky/worker-pool/interfaces';

import { WorkerPool } from '@studnicky/worker-pool/node';

class TelemetryWorkerPool extends WorkerPool<{ n: number }, number> {
  protected override onMessage(
    envelope:
      | WorkerErrorEnvelopeEntity.Type
      | WorkerLogEnvelopeEntity.Type
      | WorkerProgressEnvelopeEntity.Type
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


## Documentation

Full reference: https://studnicky.github.io/substrate/packages/worker-pool

## License

MIT
