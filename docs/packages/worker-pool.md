---
title: '@studnicky/worker-pool'
description: Run bounded work in Node worker threads or browser Web Workers.
---

# @studnicky/worker-pool

> Run work concurrently through Node worker threads or browser Web Workers.

## Install

```bash
pnpm add @studnicky/worker-pool
```

## Choose a runtime

Use `@studnicky/worker-pool/node` for `WorkerPool` and worker-thread leases. Use `@studnicky/worker-pool/browser` for `WebWorkerPool` and native Web Workers. Shared contracts live at `@studnicky/worker-pool/interfaces`.

## Run work

Configure `workerPath`, `concurrency`, and optional `timeoutMs`, then call `run(items)`. Results retain input order. A task error rejects `run`; an unexpected worker exit receives one replacement attempt.

<<< ../../packages/worker-pool/examples/observedWorkerPool.ts#usage

## Browser demo

<RunnableExample src="packages/worker-pool/examples/browserWorkerPool" title="WebWorkerPool with native browser workers" />

## Validate messages

Use `WebWorkerMessageTransport.fromEntity` to validate a JSON worker response before it resolves.

<!-- inline-ts-ok: message-boundary entity intake -->
```typescript
import { WebWorkerMessageTransport } from '@studnicky/worker-pool/browser';

import { ResultEntity } from './ResultEntity.js';

const transport = WebWorkerMessageTransport.fromEntity<ResultEntity.Type, ResultEntity.Type>(ResultEntity.intake);
```

## Cancellation and lifecycle

Pass `abortSignal` to cancel a task and `timeoutMs` to limit execution. Call `close()` when a lease pool is no longer needed and await it before releasing related resources.

## Observe workers

Override `onMessage`, `onWorkerTimeout`, or `onWorkerError` to collect worker activity. Use `getHookErrorCount()` and `getHookErrors()` to inspect hook failures.

## Entities

<!-- inline-ts-ok: published import path -->
```typescript
import { WorkerPoolConfigEntity } from '@studnicky/worker-pool/entities';
```

## Interfaces

<!-- inline-ts-ok: published import path -->
```typescript
import type { WorkerResultEnvelopeInterface } from '@studnicky/worker-pool/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `WorkerPool` | Creates a bounded Node.js worker-thread pool. | `@studnicky/worker-pool/node` |
| `WorkerPoolConfigInterface` | Defines the configuration passed to `WorkerPool.create`. | `@studnicky/worker-pool/interfaces` |
| `WorkerPoolInterface<TInput, TOutput>` | Shared `run()` and `close()` contract for Node and browser pools. | `@studnicky/worker-pool/interfaces` |
| `WorkerPoolError` | Represents worker-pool configuration and lifecycle failures. | `@studnicky/worker-pool/node` |
| `WorkerFactoryInterface` | Defines worker creation, initialization, observation, and termination. | `@studnicky/worker-pool/interfaces` |
| `WorkerLeaseInterface` | Defines an active leased worker and caller-owned request transport. | `@studnicky/worker-pool/interfaces` |
| `WorkerLeasePool` | Provides reusable, bounded worker leases. | `@studnicky/worker-pool/node` |
| `WorkerLeasePoolOptionsInterface` | Defines the factory and lease limit for `WorkerLeasePool`. | `@studnicky/worker-pool/interfaces` |
| `WorkerObservationInterface` | Defines liveness observation and observer cleanup. | `@studnicky/worker-pool/interfaces` |
| `WorkerTransportInterface` | Defines one caller-owned request/response transport. | `@studnicky/worker-pool/interfaces` |
| `WebWorkerPool` | Runs work through bounded Web Worker leases. | `@studnicky/worker-pool/browser` |
| `WebWorkerFactory` | Creates and observes native browser Workers. | `@studnicky/worker-pool/browser` |
| `WebWorkerFactoryOptionsInterface` | Defines the native Worker script and options. | `@studnicky/worker-pool/browser` |
| `WebWorkerInterface` | Defines the browser Worker lifecycle surface. | `@studnicky/worker-pool/browser` |
| `WebWorkerMessageTransport<TRequest, TResponse>` | Sends one request and decodes one Worker response, directly through an entity intake when applicable. | `@studnicky/worker-pool/browser` |
| `WebWorkerMessageTransportOptionsInterface<TResponse>` | Defines the response decoder for worker messages. | `@studnicky/worker-pool/browser` |
| `WebWorkerPoolOptionsInterface<TInput, TOutput>` | Defines the Web Worker factory, worker limit, `Signal`, caller abort source, timeout, and request transport. | `@studnicky/worker-pool/browser` |
