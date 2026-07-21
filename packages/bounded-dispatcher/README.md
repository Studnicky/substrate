# @studnicky/bounded-dispatcher

> Bounded work dispatch pattern composing `@studnicky/concurrency`'s `Semaphore`, `@studnicky/event-bus`, and `@studnicky/scheduler`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/bounded-dispatcher)

Composes three substrate primitives into the "bounded work dispatch" pattern: `dispatch()` acquires a `Semaphore` permit before running the caller's `fn`, initiates non-blocking `'dispatch'` lifecycle publications (`start` / `success` / `error`) on a composed `EventBus` around the call, and releases the permit once `fn` settles. `scheduleDispatch()` layers a `scheduler`-driven delayed dispatch on top, returning the scheduler's own cancellable task handle. Event-bus backpressure never extends the permit hold or lowers the configured work concurrency.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/bounded-dispatcher
```

## Usage

```typescript
import { BoundedDispatcher } from '@studnicky/bounded-dispatcher';

const dispatcher = BoundedDispatcher.create({ permits: 2 });

const results = await Promise.all(
  [1, 2, 3].map((n) => dispatcher.dispatch(() => doWork(n)))
);
```

`permits` is shorthand for `Semaphore.create({ permits })`. `bus` accepts either a pre-built `EventBus` instance or `BusQueueOptionsEntity.Type` config (e.g. `{ highWaterMark: 4 }`) passed straight to `EventBus.create()`. `scheduler` accepts a pre-built `SchedulerProviderInterface` — defaults to `RealTimeScheduler.create()`; pass a `VirtualScheduler` for deterministic test fixtures.

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

`BoundedDispatcherStartEventEntity`, `BoundedDispatcherSuccessEventEntity`, and `BoundedDispatcherErrorEventEntity` own the schema-derived phase discriminants composed by the runtime event interfaces. The event interfaces retain their runtime `result` and `error` fields.

## Extending

Subclass `BoundedDispatcher` to add higher-level dispatch behavior. Observe delivery through `getBus()` and retain explicit ownership of caller-supplied primitives when their lifecycle hooks are needed; those hooks fire exactly as they would standalone.

See `examples/observedBoundedDispatcher.ts` for the full runnable version, including a subscription that tallies completed and failed dispatches from the `'dispatch'` topic.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/bounded-dispatcher

## License

MIT
