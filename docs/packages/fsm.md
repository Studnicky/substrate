---
title: '@studnicky/fsm'
description: Abstract finite state machine with async effect dispatch and singleton registry.
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

## MachineRegistry: named singleton registry

`MachineRegistry` is a process-scoped store for named interpreter instances. Registering under a key makes the interpreter accessible from any module without passing references:

<<< ../../packages/fsm/examples/registry.ts#usage

## Error handling

`StateMachine.transition` wraps any throw from `reduce` in a `ReducerThrewError`. `EffectInterpreter` guards against reads before `start()` and sends after `stop()`:

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

`MachineRegistry` is a static-only class; hooks are `protected static` methods. Override them in a subclass and route all calls through the subclass.

| Hook | When it fires | Args |
|------|--------------|------|
| `onRegister(id)` | After a named interpreter is successfully registered | `id: string` |
| `onUnregister(id)` | After `unregister()` is called (fires even if the key did not exist) | `id: string` |
| `onResolveMiss(id)` | When `get()` returns `undefined` for an unknown id | `id: string` |

### Example — traced traffic light

<<< ../../packages/fsm/examples/observedFsm.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## API

| Export | Type | Description |
|--------|------|-------------|
| `StateMachine<TState, TEvent, TEffect>` | abstract class | Base FSM; implement `getInitialState` and `reduce` |
| `EffectInterpreter<TState, TEvent, TEffect>` | class | Drives a machine; use `EffectInterpreter.create()` or `EffectInterpreter.builder()` |
| `EffectInterpreterBuilder<TState, TEvent, TEffect>` | class | Fluent builder for `EffectInterpreter` |
| `MachineRegistry` | class | Process-scoped named registry of interpreters |
| `FsmStepType<TState, TEffect>` | type | `{ state, effects }` (return value of `reduce`) |
| `FsmTransitionType<TState, TEvent, TEffect>` | type | Function signature for standalone transition functions |
| `EffectHandlerMapType<TEffect>` | type | Variant-keyed async handler map |
| `MachineAlreadyRegisteredError` | class | Thrown by `MachineRegistry.register` on duplicate name |
| `ReducerThrewError` | class | Thrown by `StateMachine.transition` when `reduce` throws |

### `StateMachine<TState, TEvent, TEffect>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `getInitialState` | `() => TState` | Returns the machine's initial state |
| `reduce` | `(state, event) => FsmStepType<TState, TEffect>` | Pure transition function |
| `transition` | `(state, event) => FsmStepType<TState, TEffect>` | Calls `reduce`; wraps throws in `ReducerThrewError` |

### `EffectInterpreter<TState, TEvent, TEffect>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `start` | `() => void` | Initialises state; must be called before `send` |
| `stop` | `() => void` | Halts event processing |
| `getState` | `() => TState` | Returns current state; throws if not started |
| `send` | `(event: TEvent) => Promise<void>` | Enqueues event and drains mailbox |
| `subscribe` | `(observer) => () => void` | Registers a state observer; returns unsubscribe fn |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/fsm)
