# @studnicky/bounded-dispatcher

> Bounded work dispatch pattern composing `@studnicky/concurrency`'s `Semaphore`, `@studnicky/event-bus`, and `@studnicky/scheduler`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/bounded-dispatcher)

Import runtime values from `@studnicky/bounded-dispatcher/node` in Node or `@studnicky/bounded-dispatcher/browser` in browsers. Composes three substrate primitives into the "bounded work dispatch" pattern: `dispatch()` acquires a `Semaphore` permit before running the caller's `fn`, initiates non-blocking `'dispatch'` lifecycle publications (`start` / `success` / `error`) on a composed `EventBus` around the call, and releases the permit once `fn` settles. `scheduleDispatch()` layers a `scheduler`-driven delayed dispatch on top, returning the scheduler's own cancellable task handle. Event-bus backpressure never extends the permit hold or lowers the configured work concurrency.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/bounded-dispatcher @studnicky/pipeline
```

## Usage

```typescript
import type { OperationInterceptorInterface } from '@studnicky/pipeline/interfaces';
import { OperationPipeline } from '@studnicky/pipeline/node';
import type { BoundedDispatcherOperationContextInterface } from '@studnicky/bounded-dispatcher/interfaces';
import { BoundedDispatcher } from '@studnicky/bounded-dispatcher/node';

const observe: OperationInterceptorInterface<BoundedDispatcherOperationContextInterface> = async (context, next) => {
  const result = await next(context);
  return result;
};

const dispatcher = BoundedDispatcher.create({
  pipeline: OperationPipeline.create([observe]),
  semaphore: { permits: 2 }
});

const results = await Promise.all(
  [1, 2, 3].map((n) => dispatcher.dispatch(() => doWork(n)))
);
```

`semaphore` accepts either a pre-built `Semaphore` instance or its options (for example, `{ permits: 2, maximumQueueSize: 16 }`) passed directly to `Semaphore.create()`. `dispatch()` also accepts semaphore acquisition options: pass `{ signal }` to cancel a task while it waits, before its callback runs. `bus` accepts either a pre-built `EventBus` instance or `BusQueueOptionsEntity.Type` config (e.g. `{ highWaterMark: 4 }`) passed straight to `EventBus.create()`. `scheduler` accepts a pre-built `SchedulerProviderInterface` — defaults to `RealTimeScheduler.create()`; pass a `VirtualScheduler` for deterministic test fixtures.

`pipeline` accepts any `OperationPipelineInterface<BoundedDispatcherOperationContextInterface>`; `OperationPipeline` is the supplied implementation and surrounds the full permit-admission and callback operation. Each policy receives `BoundedDispatcherOperationContextInterface`, which exposes only the dispatch's `semaphoreOptions`, including an optional `AbortSignal`. The first policy is outermost and explicitly calls `next(context)` to continue. The dispatcher does not recover, suppress, collect, or reinterpret a policy or callback failure: the exact thrown value rejects `dispatch()`. Handle expected outcomes inside the callback or an explicit policy.

## Observability

`BoundedDispatcher` introduces no hook of its own. Permit-level observability stays on `Semaphore`'s existing hooks (`onAcquire`, `onAcquireWait`, `onContended`, `onRelease`, `onReleaseDelegated`); dispatch-level observability is the `'dispatch'` topic on the composed `EventBus`:

| Getter | Returns |
|--------|---------|
| `getBus()` | The composed `EventBus` instance |
| `hookErrorCount` | Number of rejected lifecycle publications recorded since construction |
| `getHookErrors()` | Deeply defensive snapshots of rejected publications as `HookInvocationError` records |

`getBus()` returns the exact event-bus instance passed to `create()`, so callers can subscribe to typed dispatch events and retain access to an `EventBus` subclass's delivery hooks.

### The `'dispatch'` topic

`dispatch()` initiates publication onto the `'dispatch'` topic in this lifecycle order:

1. `{ phase: 'start' }` — before `fn` runs
2. `{ phase: 'success', result }` — after `fn` resolves, or `{ phase: 'error', error }` after `fn` rejects

Publication completion is not awaited. The permit is released when `fn` settles, and a slow or backpressured subscriber cannot delay the next waiter. A rejected publication never replaces the work result or error; `hookErrorCount` and `getHookErrors()` expose the failure with its exact cause. Subscribe on `getBus()`:

```typescript
dispatcher.getBus().subscribe('dispatch', (event) => {
  if (event.phase === 'error') { console.error(event.error); }
});
```

A caller's own topic map merges onto the same bus alongside `'dispatch'` — pass `BoundedDispatcher.create<MyTopicMapInterface>()` to keep both typed on one bus.

`BoundedDispatcherStartEventEntity` is the complete JSON start event. `BoundedDispatcherSuccessEventEntity` and `BoundedDispatcherErrorEventEntity` own the JSON phase fields composed by runtime event interfaces, which retain arbitrary callback `result` and `error` values.

## Extending

Subclass `BoundedDispatcher` to add higher-level dispatch behavior. Observe delivery through `getBus()` and retain explicit ownership of caller-supplied primitives when their lifecycle hooks are needed; those hooks fire exactly as they would standalone.

See `examples/observedBoundedDispatcher.ts` for the full runnable version, including a subscription that tallies completed and failed dispatches from the `'dispatch'` topic.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/bounded-dispatcher

## License

MIT
