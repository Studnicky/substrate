---
title: '@studnicky/bounded-dispatcher'
description: Bounded work dispatch pattern composing concurrency's Semaphore, event-bus, and scheduler.
---

# @studnicky/bounded-dispatcher

> Bounded work dispatch pattern composing `@studnicky/concurrency`'s `Semaphore`, `@studnicky/event-bus`, and `@studnicky/scheduler`.

## Install

```bash
pnpm add @studnicky/bounded-dispatcher
```

## Usage

`BoundedDispatcher#dispatch(fn)` acquires a permit from the composed `Semaphore`, initiates a non-blocking `{ phase: 'start' }` publication on the `'dispatch'` topic, runs `fn`, initiates `{ phase: 'success', result }` or `{ phase: 'error', error }`, and releases the permit when `fn` settles. `scheduleDispatch(atMs, fn)` layers a scheduler-driven delayed dispatch on top, returning the scheduler's own cancellable task handle:

<<< ../../packages/bounded-dispatcher/examples/observedBoundedDispatcher.ts#usage

## Transparency contract

Import `BoundedDispatcher` and its package-owned configuration, topic-map, and dispatch-event interfaces from `@studnicky/bounded-dispatcher`. The package root is the only public code entrypoint. Import `Semaphore`, `EventBus`, and scheduler contracts directly from their owning package roots.

The package root also exports `BoundedDispatcherStartEventEntity`, `BoundedDispatcherSuccessEventEntity`, and `BoundedDispatcherErrorEventEntity`. These entities own the schema-derived phase discriminants; the event interfaces compose those fields with their runtime result and error values.

`BoundedDispatcher` introduces no hook of its own — every observable stage is either already covered by a composed primitive's own hooks, or surfaced as the `'dispatch'` topic on the composed `EventBus`:

| Config key | Accepts | Default |
|------------|---------|---------|
| `permits` | `number`, shorthand for `Semaphore.create({ permits })` | `1` |
| `bus` | `EventBus` instance or `BusQueueOptionsEntity.Type` (e.g. `{ highWaterMark }`) | `EventBus.create({})` |
| `scheduler` | `SchedulerProviderInterface` (`RealTimeScheduler` or `VirtualScheduler`) | `RealTimeScheduler.create()` |

`getBus()` is the functional access path for subscribing to and draining the dispatcher-owned bus. `hookErrorCount` reports rejected lifecycle publications, and `getHookErrors()` returns their `HookInvocationError` records. The scheduler remains caller-owned when supplied; the dispatcher creates its semaphore internally from `permits` and exposes no scheduler or semaphore getter.

`BoundedDispatcher` never re-exposes a stage a wrapped primitive's hook already covers. Permit-level observability stays on `Semaphore#onAcquire`/`onAcquireWait`/`onContended`/`onRelease`/`onReleaseDelegated`; dispatch-level observability is the `'dispatch'` topic reached through `getBus()`. Publication completion remains outside the permit hold. Rejections do not replace the work result or error.

Passing a `VirtualScheduler` gives deterministic test fixtures for free — `scheduleDispatch()` only fires once the virtual clock is advanced past `atMs`, with no kit-side test-mode flag.

## Composition order

`dispatch()`: acquire `Semaphore` permit (`Semaphore#withPermit`) → initiate `'dispatch'` `start` publication → run `fn` → initiate `'dispatch'` `success`/`error` publication → release the permit. Publication promises complete independently through the guarded hook invoker, so event-bus backpressure cannot throttle work concurrency. `scheduleDispatch()`: `scheduler.scheduleAt(atMs, () => dispatch(fn))` — the scheduler's own error containment applies to a rejecting `fn` the same way it does to any other scheduled callback.

## When this composition tips into orchestration

`BoundedDispatcher` bounds how many `fn` calls run concurrently and republishes their outcome on one bus. It has no concept of a node, a graph, or a dependency between multiple dispatches. Once a workflow needs to coordinate the *outcome* of one dispatch to decide whether or how to run another — branching, fan-out across dependent work, checkpoint/resume, or cross-dispatch retry budgets — that is workflow orchestration, not a loop of `BoundedDispatcher#dispatch()` calls glued together by hand.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/bounded-dispatcher

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/bounded-dispatcher)
