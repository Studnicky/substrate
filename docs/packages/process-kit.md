---
title: '@studnicky/process-kit'
description: Reducer-with-effects process pattern composing fsm, scheduler, and signal.
---

# @studnicky/process-kit

> Reducer-with-effects process pattern composing `@studnicky/fsm`, `@studnicky/scheduler`, and `@studnicky/signal`.

## Install

```bash
pnpm add @studnicky/process-kit
```

## Usage

`ProcessKit` wraps a caller-supplied `StateMachine` subclass with an internally-built `EffectInterpreter`, a `SchedulerProviderType` (real-time by default, or a `VirtualScheduler` for deterministic tests), and a `Signal` for cancellation composition. `machine` is the only required field — `ProcessKit` never invents a reducer, only wires one to its supporting primitives:

<<< ../../packages/process-kit/examples/observedProcessKit.ts#usage

## Transparency contract

`ProcessKit` introduces no hook of its own — every observable stage is already covered by the primitive it delegates to:

| Config key | Accepts | Default |
|------------|---------|---------|
| `machine` | `StateMachine` subclass instance | required — no default |
| `handlers` | `EffectHandlerMapType<TEffect, TEvent>` | `undefined` — no effects handled |
| `scheduler` | `SchedulerProviderType` (`RealTimeScheduler`/`VirtualScheduler`) | `RealTimeScheduler.create()` |
| `signal` | `Signal` instance | `Signal.create()` |

| Getter | Returns |
|--------|---------|
| `getMachine()` | The composed `StateMachine` instance |
| `getInterpreter()` | The composed `EffectInterpreter` instance |
| `getScheduler()` | The composed `SchedulerProviderType` instance |
| `getSignal()` | The composed `Signal` instance |

Every getter returns the exact instance passed to `create()`/`builder()` — never a copy or wrapper. A caller who subclassed `StateMachine` for its 6 lifecycle hooks keeps full access to those hooks; `EffectInterpreter`'s 9 hooks and the scheduler's own hooks remain reachable through `getInterpreter()`/`getScheduler()`.

## `dispatch()` vs. the effect-handler `dispatch` capability

`EffectInterpreter`'s effect handlers receive their own `(effect, dispatch) => void` capability, whose `dispatch(event)` enqueues an event at the front of the mailbox and is only ever processed within the **same drain cycle** that invoked the handler. `ProcessKit#dispatch(event)` is the public, external entry point and always goes through the interpreter's real `send()`. `ProcessKit#scheduleDispatch(atMs, event)` schedules a callback that fires well after any drain cycle has ended, so it correctly calls `dispatch()`/`send()`, never the effect-handler capability — see the example above, where the `scheduleAdvance` effect's handler calls `kit.scheduleDispatch(...)` rather than the `dispatch` parameter it was given.

## Orchestration-boundary risk flags

`ProcessKit` sits nearest the Dagonizer boundary of substrate's pattern kits. Three boundaries are enforced by convention, not by a runtime guard:

1. **`scheduleDispatch` chaining** — do not nest `scheduleDispatch` calls that branch on the resulting state to schedule the next step; that is hand-rolling a workflow scheduler. Let a single `StateMachine` own sequencing as ordinary transitions.
2. **Multi-instance registries** — do not build a registry/lookup of many named `ProcessKit` instances dispatched into by name; that is node-placement, which belongs to Dagonizer.
3. **Checkpoint/resume creep** — `stop()`/teardown must stay in-memory only; do not add a `save`/`resume` pair backed by a store.

See [Composition Anti-Patterns](/concepts/composition-anti-patterns) and [Substrate vs. Dagonizer Boundary](/concepts/dagonizer-boundary) for the full rationale.

## When to stop using this and move to Dagonizer

`ProcessKit` drives exactly one process (one machine, one interpreter, one scheduler) through in-memory transitions. It has no concept of a node, a graph, or a dependency between multiple processes. Once a workflow needs to coordinate the outcome of one process to decide whether or how to run another — branching, fan-out across dependent processes, checkpoint/resume, or cross-process retry budgets — that is workflow orchestration and belongs in Dagonizer, not in a hand-rolled registry or chain of `ProcessKit` instances.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/process-kit

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/process-kit)
