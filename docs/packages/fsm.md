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

## MachineRegistry — named singleton registry

`MachineRegistry` is a process-scoped store for named interpreter instances. Registering under a key makes the interpreter accessible from any module without passing references:

<<< ../../packages/fsm/examples/registry.ts#usage

## Error handling

`StateMachine.transition` wraps any throw from `reduce` in a `ReducerThrewError`. `EffectInterpreter` guards against reads before `start()` and sends after `stop()`:

<<< ../../packages/fsm/examples/error-handling.ts#usage

## API

| Export | Type | Description |
|--------|------|-------------|
| `StateMachine<TState, TEvent, TEffect>` | abstract class | Base FSM; implement `getInitialState` and `reduce` |
| `EffectInterpreter<TState, TEvent, TEffect>` | class | Drives a machine; dispatches effects asynchronously |
| `MachineRegistry` | class | Process-scoped named registry of interpreters |
| `FsmStepType<TState, TEffect>` | type | `{ state, effects }` — return value of `reduce` |
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
