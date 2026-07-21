---
title: '@studnicky/process-kit'
description: Reducer-with-effects process pattern composing fsm and scheduler.
---

# @studnicky/process-kit

> Reducer-with-effects process pattern composing `@studnicky/fsm` and `@studnicky/scheduler`.

## Install

```bash
pnpm add @studnicky/process-kit
```

## Usage

`ProcessKit` wraps a caller-supplied `StateMachine` subclass with an internally-built `EffectInterpreter` and a `SchedulerProviderInterface` (real-time by default, or a `VirtualScheduler` for deterministic tests). `machine` is the only required field — `ProcessKit` never invents a reducer, only wires one to its supporting primitives:

<<< ../../packages/process-kit/examples/observedProcessKit.ts#usage

## Transparency contract

`ProcessKit` introduces no hook of its own — every observable stage is already covered by the primitive it delegates to:

| Config key | Accepts | Default |
|------------|---------|---------|
| `machine` | `StateMachine` subclass instance | required — no default |
| `handler` | `EffectHandlerInterface<TEffect, TEvent>` | `undefined` — no effects handled; configure through `ProcessKit.create({ machine, handler })` |
| `scheduler` | `SchedulerProviderInterface` (`RealTimeScheduler`/`VirtualScheduler`) | `RealTimeScheduler.create()` |

`ProcessKit` exposes no collaborator getters. Callers retain their machine and optional scheduler references when they need those primitives' lifecycle APIs. The interpreter is owned internally and receives the singular handler through `ProcessKit.create({ machine, handler, scheduler? })`.

Import `ProcessKit` and `ProcessKitConfigInterface` from `@studnicky/process-kit`. The package root is the only public code entrypoint.

## `dispatch()` vs. the effect-handler `dispatch` capability

`EffectInterpreter`'s effect handlers receive their own `(effect, dispatch) => void` capability, whose `dispatch(event)` enqueues an event at the front of the mailbox and is only ever processed within the **same drain cycle** that invoked the handler. `ProcessKit#dispatch(event)` is the public, external entry point and always goes through the interpreter's real `send()`. `ProcessKit#scheduleDispatch(atMs, event)` schedules a callback that fires well after any drain cycle has ended, so it correctly calls `dispatch()`/`send()`, never the effect-handler capability — see the example above, where the `scheduleAdvance` effect's handler calls `kit.scheduleDispatch(...)` rather than the `dispatch` parameter it was given.

## Orchestration-boundary risk flags

`ProcessKit` sits nearest substrate's scope boundary of its pattern kits. Three boundaries are enforced by convention, not by a runtime guard:

1. **`scheduleDispatch` chaining** — do not nest `scheduleDispatch` calls that branch on the resulting state to schedule the next step; that is hand-rolling a workflow scheduler. Let a single `StateMachine` own sequencing as ordinary transitions.
2. **Multi-instance registries** — do not build a registry/lookup of many named `ProcessKit` instances dispatched into by name; that is node-placement, outside substrate's scope.
3. **Checkpoint/resume creep** — `stop()`/teardown must stay in-memory only; do not add a `save`/`resume` pair backed by a store.

## When this composition tips into orchestration

`ProcessKit` drives exactly one process (one machine, one interpreter, one scheduler) through in-memory transitions. It has no concept of a node, a graph, or a dependency between multiple processes. Once a workflow needs to coordinate the outcome of one process to decide whether or how to run another — branching, fan-out across dependent processes, checkpoint/resume, or cross-process retry budgets — that is workflow orchestration, not a hand-rolled registry or chain of `ProcessKit` instances.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/process-kit

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/process-kit)
