# @studnicky/bounded-dispatcher

> Bounded work dispatch pattern composing `@studnicky/concurrency`'s `Semaphore`, `@studnicky/event-bus`, and `@studnicky/scheduler`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/bounded-dispatcher)

Composes three substrate primitives into the "bounded work dispatch" pattern: `dispatch()` acquires a `Semaphore` permit before running the caller's `fn`, publishes `'dispatch'` lifecycle events (`start` / `success` / `error`) onto a composed `EventBus` around the call, and releases the permit once `fn` settles. `scheduleDispatch()` layers a `scheduler`-driven delayed dispatch on top, returning the scheduler's own cancellable task handle. Correct backpressure forwarding across these three primitives — acquiring before publishing `start`, releasing exactly once regardless of outcome, publishing `success`/`error` before the permit frees the next waiter — is exactly the wiring a consumer would otherwise get subtly wrong by hand.

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

`permits` is shorthand for `Semaphore.create({ permits })`. `bus` accepts either a pre-built `EventBus` instance or `BusQueueOptionsEntity.Type` config (e.g. `{ highWaterMark: 4 }`) passed straight to `EventBus.create()`. `scheduler` accepts a pre-built `SchedulerProviderType` — defaults to `RealTimeScheduler.create()`; pass a `VirtualScheduler` for deterministic test fixtures.

## Transparency

`BoundedDispatcher` introduces no hook of its own. Permit-level observability stays on `Semaphore`'s existing hooks (`onAcquire`, `onAcquireWait`, `onContended`, `onRelease`, `onReleaseDelegated`); dispatch-level observability is the `'dispatch'` topic on the composed `EventBus`:

| Getter | Returns |
|--------|---------|
| `getSemaphore()` | The composed `Semaphore` instance |
| `getBus()` | The composed `EventBus` instance |
| `getScheduler()` | The composed `SchedulerProviderType` instance |

Every getter returns the exact instance passed to `create()`/`builder()` — never a copy or wrapper — so a caller who subclassed `Semaphore` for custom queueing behavior, or `EventBus` for custom delivery hooks, keeps full access to those subclasses' own hooks.

### The `'dispatch'` topic

`dispatch()` publishes onto the `'dispatch'` topic in this order:

1. `{ phase: 'start' }` — before `fn` runs
2. `{ phase: 'success', result }` — after `fn` resolves, or `{ phase: 'error', error }` after `fn` rejects

The permit is released after the terminal event is published, but always before `dispatch()`'s returned promise settles. Subscribe on `getBus()`:

```typescript
dispatcher.getBus().subscribe('dispatch', (event) => {
  if (event.phase === 'error') { console.error(event.error); }
});
```

A caller's own topic map merges onto the same bus alongside `'dispatch'` — pass `BoundedDispatcher.create<MyTopicMapType>()` to keep both typed on one bus.

## Extending

Subclass `BoundedDispatcher` to add convenience behavior that reaches the composed instances through the getters — `BoundedDispatcher` has no lifecycle hooks of its own to override. Subclass the composed primitives themselves (`Semaphore`, `EventBus`) to observe permit or delivery stages directly; those hooks fire exactly as they would standalone.

See `examples/observedBoundedDispatcher.ts` for the full runnable version, including a subclass that tallies completed/failed dispatches from the `'dispatch'` topic.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/bounded-dispatcher

## License

MIT
