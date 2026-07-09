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

`BoundedDispatcher#dispatch(fn)` acquires a permit from the composed `Semaphore`, publishes a `{ phase: 'start' }` event on the `'dispatch'` topic, runs `fn`, publishes `{ phase: 'success', result }` or `{ phase: 'error', error }`, and releases the permit — regardless of outcome. `scheduleDispatch(atMs, fn)` layers a `scheduler`-driven delayed dispatch on top, returning the scheduler's own cancellable task handle:

<<< ../../packages/bounded-dispatcher/examples/observedBoundedDispatcher.ts#usage

## Transparency contract

`BoundedDispatcher` introduces no hook of its own — every observable stage is either already covered by a composed primitive's own hooks, or surfaced as the `'dispatch'` topic on the composed `EventBus`:

| Config key | Accepts | Default |
|------------|---------|---------|
| `permits` | `number`, shorthand for `Semaphore.create({ permits })` | `1` |
| `bus` | `EventBus` instance or `BusQueueOptionsEntity.Type` (e.g. `{ highWaterMark }`) | `EventBus.create({})` |
| `scheduler` | `SchedulerProviderType` (`RealTimeScheduler` or `VirtualScheduler`) | `RealTimeScheduler.create()` |

| Getter | Returns |
|--------|---------|
| `getSemaphore()` | The composed `Semaphore` instance |
| `getBus()` | The composed `EventBus` instance |
| `getScheduler()` | The composed `SchedulerProviderType` instance |

Every getter returns the exact instance passed to `create()`/`builder()` — never a copy or wrapper. A caller who subclassed `Semaphore` for custom queueing, or `EventBus` for custom delivery hooks, keeps full access to those subclasses' own hooks; `BoundedDispatcher` never re-exposes a stage a wrapped primitive's hook already covers (no redundant "before acquire" hook, no redundant "on publish" hook). Permit-level observability stays entirely on `Semaphore#onAcquire`/`onAcquireWait`/`onContended`/`onRelease`/`onReleaseDelegated`; dispatch-level observability is the `'dispatch'` topic, reachable through `getBus()`.

Passing a `VirtualScheduler` gives deterministic test fixtures for free — `scheduleDispatch()` only fires once the virtual clock is advanced past `atMs`, with no kit-side test-mode flag.

## Composition order

`dispatch()`: acquire `Semaphore` permit (`Semaphore#withPermit`) → publish `'dispatch'` `start` → run `fn` → publish `'dispatch'` `success`/`error` → release the permit. `scheduleDispatch()`: `scheduler.scheduleAt(atMs, () => dispatch(fn))` — the scheduler's own error containment applies to a rejecting `fn` the same way it does to any other scheduled callback (the scheduler's `onFireError` hook is the only observability seam for a scheduled dispatch's failure that no caller awaited).

## When to stop using this and move to Dagonizer

`BoundedDispatcher` bounds how many `fn` calls run concurrently and republishes their outcome on one bus. It has no concept of a node, a graph, or a dependency between multiple dispatches. Once a workflow needs to coordinate the *outcome* of one dispatch to decide whether or how to run another — branching, fan-out across dependent work, checkpoint/resume, or cross-dispatch retry budgets — that is workflow orchestration and belongs in Dagonizer, not in a loop of `BoundedDispatcher#dispatch()` calls glued together by hand.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/bounded-dispatcher

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/bounded-dispatcher)
