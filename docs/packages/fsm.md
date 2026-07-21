---
title: '@studnicky/fsm'
description: Abstract finite state machine with async effect dispatch and an instantiable named registry.
---

# @studnicky/fsm

> Type-safe abstract FSM base class with async effect interpretation and named machine registry.

## Install

```bash
pnpm add @studnicky/fsm
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Define a `StateMachine` subclass with `getInitialState` and `reduce`, then drive it with `EffectInterpreter`. The interpreter manages the mailbox, dispatches effects, and notifies subscribers on every state change:

<<< ../../packages/fsm/examples/traffic-light.ts#usage

## MachineRegistry: named registry

Each `MachineRegistry.create()` call creates an independent store for named interpreter instances. Registering under a key makes the interpreter available to code holding that registry instance:

<<< ../../packages/fsm/examples/registry.ts#usage

## Error handling

`StateMachine.transition` rethrows `TransitionRejectedError` unchanged and wraps other reducer defects in `ReducerThrewError`. `EffectInterpreter` guards against reads before `start()` and sends after `stop()`:

<<< ../../packages/fsm/examples/error-handling.ts#usage

## Observability hooks

Every stateful class exposes `protected` hook methods that fire at each significant stage. Override them in a subclass to add logging, tracing, or metrics without changing any public behaviour.

### `StateMachine` hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onTransition(from, to, event)` | After a successful state-variant change, before the step is returned | `from: TState`, `to: TState`, `event: TEvent` |
| `onEnterState(state)` | When entering a new state variant (fires after `onTransition`) | `state: TState` |
| `onExitState(state)` | When leaving the current state variant (fires before `onTransition`) | `state: TState` |
| `onTransitionRejected(state, event, reason)` | When `reduce` throws — no valid transition / guard failed | `state: TState`, `event: TEvent`, `reason: string` |

`onTransition`, `onEnterState`, and `onExitState` are only called when the state **variant** changes. Self-loops (same variant returned) fire none of them.

### `EffectInterpreter` hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onStart(state)` | After `start()` sets the initial state | `state: TState` |
| `onStop(state)` | After `stop()` halts event processing | `state: TState \| undefined` |
| `onEnqueue(event)` | When an event is added to the mailbox by `send()` | `event: TEvent` |
| `onTransition(from, to, event)` | When the interpreter commits a state-variant change | `from: TState`, `to: TState`, `event: TEvent` |
| `onEnterState(state)` | After committing a new state variant | `state: TState` |
| `onExitState(state)` | Before committing the new state, while still in the old variant | `state: TState` |
| `onEffectStart(effect)` | Before invoking an effect handler | `effect: TEffect` |
| `onEffectSuccess(effect)` | After an effect handler resolves successfully | `effect: TEffect` |
| `onEffectError(effect, error)` | When an effect handler throws | `effect: TEffect`, `error: Error` |

### `MachineRegistry` hooks

`MachineRegistry` exposes protected instance hooks. Override them in a subclass and call `register`, `unregister`, and `get` on that registry instance.

| Hook | When it fires | Args |
|------|--------------|------|
| `onRegister(id)` | After a named interpreter is successfully registered | `id: string` |
| `onUnregister(id)` | After `unregister()` is called (fires even if the key did not exist) | `id: string` |
| `onResolveMiss(id)` | When `get()` returns `undefined` for an unknown id | `id: string` |

### Example — traced traffic light

<<< ../../packages/fsm/examples/observedFsm.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## API

Import every FSM class, package-owned interface, and package error from `@studnicky/fsm`. The package root is the only public code entrypoint.

| Export | Type | Description |
|--------|------|-------------|
| `StateMachine<TState, TEvent, TEffect>` | abstract class | Base FSM; implement `getInitialState` and `reduce` |
| `EffectInterpreter<TState, TEvent, TEffect>` | class | Drives a machine; configure a singular handler through `create({ machine, handler })` |
| `InterpreterHistory<TState, TEvent, TEffect>` | class | Bounded recorder of one interpreter's variant-changing transitions |
| `MachineRegistry<TState, TEvent>` | class | Instantiable named registry of interpreters |
| `FsmStepInterface<TState, TEffect>` | interface | Readonly `{ state, effects }` contract returned by `reduce` |
| `FsmTransitionInterface<TState, TEvent, TEffect>` | interface | Callable contract for standalone transition functions |
| `EffectHandlerInterface<TEffect, TEvent>` | interface | Singular callable effect handler with an in-drain `dispatch(event)` capability |
| `InterpreterHistoryRecordInterface<TState, TEvent>` | interface | Readonly transition-history record contract |
| `RegisteredInterpreterInterface<TState, TEvent>` | interface | Interpreter contract accepted by `MachineRegistry` |
| `InterpreterHistoryRecordMetadataEntity` | namespace | Schema-derived transition-record timestamp contract |
| `RegisteredInterpreterMetricsEntity` | namespace | Schema-derived hook-error count contract |
| `FsmError` and package errors | classes | `FsmConfigError`, interpreter lifecycle errors, mailbox capacity errors, registry errors, reducer defects, termination, and rejected transitions |

### `StateMachine<TState, TEvent, TEffect>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `getInitialState` | `() => TState` | Returns the machine's initial state |
| `reduce` | `(state, event) => FsmStepInterface<TState, TEffect>` | Pure transition function |
| `transition` | `(state, event) => FsmStepInterface<TState, TEffect>` | Calls `reduce`; wraps reducer defects in `ReducerThrewError` |

### `EffectInterpreter<TState, TEvent, TEffect>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `start` | `() => void` | Initialises state; must be called before `send` |
| `stop` | `() => void` | Halts event processing |
| `getState` | `() => TState` | Returns current state; throws if not started |
| `send` | `(event: TEvent) => Promise<void>` | Enqueues event and drains mailbox |
| `subscribe` | `(observer) => () => void` | Registers a state observer; returns unsubscribe fn |

### `InterpreterHistory<TState, TEvent, TEffect>`

`InterpreterHistory` is a bounded `EffectInterpreter` with the same optional singular handler. It records each variant-changing `onTransition` event and exposes readonly, isolated snapshots:

<<< ../../packages/fsm/examples/interpreterHistory.ts#usage

Each `InterpreterHistoryRecordInterface<TState, TEvent>` contains `event`, `from`, `to`, and `timestamp`. `history()` returns a fresh oldest-first snapshot. The internal ring retains at most `capacity` records and evicts the oldest when full. Successful sends that retain the current state variant are absent because the recorder follows `EffectInterpreter.onTransition` semantics.

The record timestamp composes from `InterpreterHistoryRecordMetadataEntity`, registered-interpreter metrics compose from `RegisteredInterpreterMetricsEntity`, and history capacity uses `CircularBufferOptionsEntity.Type['capacity']` directly from `@studnicky/circular-buffer`.

## Try it

Run the examples below directly in the browser to see the FSM primitives in action.

### Lifecycle hooks

Every variant-changing state transition fires hooks on both the machine and interpreter layers — watch the paired log lines as each advance propagates.

<RunnableExample src="packages/fsm/examples/observedFsm" title="FSM lifecycle hooks" />

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/fsm)
