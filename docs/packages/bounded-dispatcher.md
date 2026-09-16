---
title: '@studnicky/bounded-dispatcher'
description: Bound concurrent asynchronous work and publish its outcomes.
---

# @studnicky/bounded-dispatcher

> Run asynchronous work with a configurable concurrency limit, outcome events, and delayed dispatch.

## Install

```bash
pnpm add @studnicky/bounded-dispatcher @studnicky/pipeline
```

## Usage

Import `BoundedDispatcher` from `@studnicky/bounded-dispatcher/node` in Node or `@studnicky/bounded-dispatcher/browser` in browsers. Use `dispatch(fn)` to run a task within the configured limit. Subscribe to the `dispatch` topic for `start`, `success`, and `error` events. `scheduleDispatch(atMs, fn)` returns a cancellable task for delayed work.

<<< ../../packages/bounded-dispatcher/examples/observedBoundedDispatcher.ts#usage

## Configure

| Config key | Accepts | Default |
|------------|---------|---------|
| `semaphore` | A `Semaphore` or its options, including `permits` and `maximumQueueSize` | A new one-permit semaphore |
| `bus` | An `EventBus` or bus options | A new event bus |
| `scheduler` | A scheduler provider | A real-time scheduler |
| `pipeline` | An `OperationPipelineInterface<BoundedDispatcherOperationContextInterface>` | No policy layer |

Use `getBus()` to subscribe to events and `getHookErrors()` to inspect event-publication failures. Pass `{ signal }` as the second `dispatch()` argument to cancel a queued task before its callback runs. Supply a `VirtualScheduler` when your application controls time.

`pipeline` accepts any `OperationPipelineInterface<BoundedDispatcherOperationContextInterface>`; `OperationPipeline` is the supplied implementation. It surrounds the full permit-acquisition and callback operation. Policies receive only `semaphoreOptions` for the current dispatch, including its optional `AbortSignal`. Policies call `next(context)` to continue. The dispatcher lets a policy or callback failure reject `dispatch()` unchanged; handle expected failures in that callback or policy.

## Try it

<RunnableExample src="packages/bounded-dispatcher/examples/observedBoundedDispatcher" title="Bounded dispatch and scheduled work" />

## Entities

Use `@studnicky/bounded-dispatcher/entities` for JSON dispatch-event data.

<!-- inline-ts-ok: published import path -->
```typescript
import { BoundedDispatcherStartEventEntity } from '@studnicky/bounded-dispatcher/entities';
```

## Interfaces

Use `@studnicky/bounded-dispatcher/interfaces` for configuration and event contracts.

<!-- inline-ts-ok: published import path -->
```typescript
import type { BoundedDispatcherConfigInterface, BoundedDispatcherOperationContextInterface } from '@studnicky/bounded-dispatcher/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BoundedDispatcher` | Runs bounded asynchronous work in Node. | `@studnicky/bounded-dispatcher/node` |
| `BoundedDispatcher` | Runs bounded asynchronous work in browsers. | `@studnicky/bounded-dispatcher/browser` |
| `BoundedDispatcherOperationContextInterface` | Dispatch-policy acquisition options. | `@studnicky/bounded-dispatcher/interfaces` |
