---
title: "@studnicky/fsm"
description: Abstract finite state machine with async effect dispatch and an instantiable named registry.
---

# @studnicky/fsm

> Type-safe abstract FSM base class with async effect interpretation and named machine registry.

## What it is

A composable finite-state-machine primitive: a consumer supplies states, events, a reducer, and optional effect handling while the package supplies legal transition execution, mailbox management, and lifecycle observation. It does not prescribe a domain state chart or workflow.

## What it is for

Northstar Books uses it to make the allowed transitions of a fulfilment or return flow explicit and testable. Consumers own the order states, guards, effects, and external integrations; the package protects the mechanical transition and effect-dispatch boundary.

## Northstar Books examples

The runnable lifecycle-hooks example advances a state machine and records paired machine and interpreter events. It maps to Northstar Books observing each legal fulfilment-state change, proving that instrumentation can attach to transitions without embedding a logging product or changing reducer behavior.

## Public entrypoints

| Import path                 | Use it when                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `@studnicky/fsm/node`       | A Northstar Books server runs typed order, return, or fulfilment state machines.            |
| `@studnicky/fsm/browser`    | A browser client runs the same portable state-machine contract for local interaction state. |
| `@studnicky/fsm/entities`   | An adapter validates the package's interpreter history and registry metrics data.           |
| `@studnicky/fsm/interfaces` | TypeScript code shares state, transition, effect, registry, and history contracts.          |

## Install

```bash
pnpm add @studnicky/fsm
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Define a `StateMachine` subclass with `getInitialState` and `reduce`, then drive it with `EffectInterpreter`. The interpreter manages the mailbox, dispatches effects, and notifies subscribers on every state change:

## Pipeline effects

A reducer can emit a data-only `PipelineEffectInterface<TEvent>` with `variant: 'pipeline'` and a typed event. `PipelineEffectHandler.create(pipeline)` runs its injected `PipelineInterface<TEvent>`, then dispatches the pipeline result through the interpreter mailbox. The reducer validates that follow-up event and chooses the declared next state; the pipeline neither holds a machine nor selects a state. A rejected pipeline follows the ordinary effect-handler failure path after the intermediate state commits.

### Northstar Books fulfilment workflow

Northstar Books accepts web orders only through declared fulfilment transitions: a paid order moves to preparing, a warehouse result moves it to allocated or back to review, and a shipment confirmation moves it to shipped. The reducer is the authority for those legal states and rejects events that do not apply to the current order.

A preparing transition can emit a pipeline effect that validates the order, calculates its price, and requests warehouse allocation. The interpreter runs that pipeline and feeds its resulting event back through the mailbox; the reducer then decides the next declared state. This describes a web/server integration pattern rather than output from the runnable traffic-light example above.

## MachineRegistry: named registry

Northstar Books might run several independent toggles or small machines side by side — a feature flag here, a sync indicator there — and each one needs a name other code can look it up by, without those machines bleeding into each other across unrelated parts of the app. `MachineRegistry.create()` gives you exactly that: a fresh, isolated namespace. The example below registers one interpreter under `'toggle-a'`, drives it entirely through the registry rather than the original object, proves a second registration under the same name throws, and shows that unregistering it frees the name again:

<<< ../../packages/fsm/examples/registry.ts#usage

## Error handling

A reducer is just a function, and functions can misbehave — throw on a bad event, get read before the interpreter is ready, or get sent to after it has already shut down. Rather than let any of that surface as a bare, unrecognizable exception, the FSM wraps each failure in a named error you can catch for. This example triggers all three: a reducer that throws mid-transition (wrapped as `ReducerThrewError`), a `getState()` call before `start()` (`InterpreterNotStartedError`), and a `send()` after `stop()` (`InterpreterNotRunningError`):

<<< ../../packages/fsm/examples/error-handling.ts#usage

## Observability hooks

Every stateful class exposes `protected` hook methods that fire at each significant stage. Override them in a subclass to add logging, tracing, or metrics without changing any public behaviour.

### `StateMachine` hooks

| Hook                                         | When it fires                                                        | Args                                               |
| -------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| `onTransition(from, to, event)`              | After a successful state-variant change, before the step is returned | `from: TState`, `to: TState`, `event: TEvent`      |
| `onEnterState(state)`                        | When entering a new state variant (fires after `onTransition`)       | `state: TState`                                    |
| `onExitState(state)`                         | When leaving the current state variant (fires before `onTransition`) | `state: TState`                                    |
| `onTransitionRejected(state, event, reason)` | When `reduce` throws — no valid transition / guard failed            | `state: TState`, `event: TEvent`, `reason: string` |

`onTransition`, `onEnterState`, and `onExitState` are only called when the state **variant** changes. Self-loops (same variant returned) fire none of them.

### `EffectInterpreter` hooks

| Hook                            | When it fires                                                   | Args                                          |
| ------------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| `onStart(state)`                | After `start()` sets the initial state                          | `state: TState`                               |
| `onStop(state)`                 | After `stop()` halts event processing                           | `state: TState \| undefined`                  |
| `onEnqueue(event)`              | When an event is added to the mailbox by `send()`               | `event: TEvent`                               |
| `onTransition(from, to, event)` | When the interpreter commits a state-variant change             | `from: TState`, `to: TState`, `event: TEvent` |
| `onEnterState(state)`           | After committing a new state variant                            | `state: TState`                               |
| `onExitState(state)`            | Before committing the new state, while still in the old variant | `state: TState`                               |
| `onEffectStart(effect)`         | Before invoking an effect handler                               | `effect: TEffect`                             |
| `onEffectSuccess(effect)`       | After an effect handler resolves successfully                   | `effect: TEffect`                             |
| `onEffectError(effect, error)`  | When an effect handler throws                                   | `effect: TEffect`, `error: Error`             |

### `MachineRegistry` hooks

`MachineRegistry` exposes protected instance hooks. Override them in a subclass and call `register`, `unregister`, and `get` on that registry instance.

| Hook                | When it fires                                                        | Args         |
| ------------------- | -------------------------------------------------------------------- | ------------ |
| `onRegister(id)`    | After a named interpreter is successfully registered                 | `id: string` |
| `onUnregister(id)`  | After `unregister()` is called (fires even if the key did not exist) | `id: string` |
| `onResolveMiss(id)` | When `get()` returns `undefined` for an unknown id                   | `id: string` |

### Example — traced traffic light

Here is all three layers wired up with their hooks at once: a traffic-light machine logging its own transitions, an interpreter logging effect dispatch around it, and a registry logging registration events — the full stack a Northstar Books ops dashboard would tap into to watch a fulfilment machine live. Watch the paired `[fsm:machine]` and `[fsm:interp]` log lines as the light advances red → green → amber → red, a chime effect firing on the amber transition, and a deliberate lookup miss against an unregistered id along the way.

<<< ../../packages/fsm/examples/observedFsm.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## API

Import FSM classes and package errors from `@studnicky/fsm/node`; import type contracts from `@studnicky/fsm/interfaces` and schema namespaces from `@studnicky/fsm/entities`.

| Export                                                                  | Type           | Description                                                                                                                                      |
| ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `StateMachine<TState, TEvent, TEffect>`                                 | abstract class | Base FSM; implement `getInitialState` and `reduce`                                                                                               |
| `EffectInterpreter<TState, TEvent, TEffect>`                            | class          | Drives a machine; configure a singular handler through `create(machine, { handler })`                                                            |
| `InterpreterHistory<TState, TEvent, TEffect>`                           | class          | Bounded recorder of one interpreter's variant-changing transitions                                                                               |
| `MachineRegistry<TState, TEvent>`                                       | class          | Instantiable named registry of interpreters                                                                                                      |
| `FsmStepInterface<TState, TEffect>`                                     | interface      | Readonly `{ state, effects }` contract returned by `reduce`                                                                                      |
| `FsmTransitionInterface<TState, TEvent, TEffect>`                       | interface      | Callable contract for standalone transition functions                                                                                            |
| `EffectHandlerInterface<TEffect, TEvent>`                               | interface      | Singular callable effect handler with an in-drain `dispatch(event)` capability                                                                   |
| `PipelineEffectHandler`                                                 | value          | Creates an effect handler that runs an injected typed pipeline and dispatches its resulting event                                                | `@studnicky/pipeline/fsm`            |
| `PipelineEffectInterface<TEvent>`                                       | interface      | Data-only `pipeline` effect descriptor containing the event supplied to its pipeline                                                             | `@studnicky/pipeline/fsm/interfaces` |
| `EffectInterpreterConstructorOptionsInterface<TState, TEvent, TEffect>` | interface      | Parameter contract for `EffectInterpreter`'s protected constructor; annotate a subclass constructor's parameter with it                          |
| `InterpreterHistoryRecordInterface<TState, TEvent>`                     | interface      | Readonly transition-history record contract                                                                                                      |
| `RegisteredInterpreterInterface<TState, TEvent>`                        | interface      | Interpreter contract accepted by `MachineRegistry`                                                                                               |
| `InterpreterHistoryRecordMetadataEntity`                                | namespace      | Schema-derived transition-record timestamp contract                                                                                              |
| `RegisteredInterpreterMetricsEntity`                                    | namespace      | Schema-derived hook-error count contract                                                                                                         |
| `FsmError` and package errors                                           | classes        | `FsmConfigError`, interpreter lifecycle errors, mailbox capacity errors, registry errors, reducer defects, termination, and rejected transitions |

### `StateMachine<TState, TEvent, TEffect>`

| Member            | Signature                                             | Description                                                  |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `getInitialState` | `() => TState`                                        | Returns the machine's initial state                          |
| `reduce`          | `(state, event) => FsmStepInterface<TState, TEffect>` | Pure transition function                                     |
| `transition`      | `(state, event) => FsmStepInterface<TState, TEffect>` | Calls `reduce`; wraps reducer defects in `ReducerThrewError` |

### `EffectInterpreter<TState, TEvent, TEffect>`

| Member      | Signature                          | Description                                        |
| ----------- | ---------------------------------- | -------------------------------------------------- |
| `start`     | `() => void`                       | Initialises state; must be called before `send`    |
| `stop`      | `() => void`                       | Halts event processing                             |
| `getState`  | `() => TState`                     | Returns current state; throws if not started       |
| `send`      | `(event: TEvent) => Promise<void>` | Enqueues event and drains mailbox                  |
| `subscribe` | `(observer) => () => void`         | Registers a state observer; returns unsubscribe fn |

### `InterpreterHistory<TState, TEvent, TEffect>`

Sometimes you don't want a subclass just to remember the last few transitions — you want that memory built in. `InterpreterHistory` is an `EffectInterpreter` that keeps its own bounded ring of transition records, evicting the oldest once it's full. The example below caps that ring at 2 and sends 3 advances through a traffic light, so the very first transition (red → green) falls out of the recorded history, leaving only the two most recent:

<<< ../../packages/fsm/examples/interpreterHistory.ts#usage

Each `InterpreterHistoryRecordInterface<TState, TEvent>` contains `event`, `from`, `to`, and `timestamp`. `history()` returns a fresh oldest-first snapshot. The internal ring retains at most `capacity` records and evicts the oldest when full. Successful sends that retain the current state variant are absent because the recorder follows `EffectInterpreter.onTransition` semantics.

The record timestamp composes from `InterpreterHistoryRecordMetadataEntity`, registered-interpreter metrics compose from `RegisteredInterpreterMetricsEntity`, and history capacity uses `CircularBufferOptionsEntity.Type['capacity']` directly from `@studnicky/circular-buffer/entities`.

## Try it

Run the examples below directly in the browser to see the FSM primitives in action.

### Lifecycle hooks

Run the traffic light live and watch the two layers talk to each other: every advance fires a matched pair of log lines, one from the machine announcing its own state change and one from the interpreter announcing the same change plus any effect it dispatched.

<RunnableExample src="packages/fsm/examples/observedFsm" title="FSM lifecycle hooks" />

## Entities

`@studnicky/fsm/entities` exports interpreter history and registry metrics.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import { InterpreterHistoryRecordMetadataEntity } from "@studnicky/fsm/entities";
```

## Exports

| Symbol                                         | Purpose                                                                                                                                                                                 | Import path                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `EffectHandlerInterface`                       | Defines effect execution callbacks.                                                                                                                                                     | `@studnicky/fsm/interfaces`          |
| `PipelineEffectHandler`                        | Creates an effect handler that runs a pipeline result through the interpreter mailbox.                                                                                                  | `@studnicky/pipeline/fsm`            |
| `PipelineEffectInterface`                      | Defines a data-only pipeline effect descriptor.                                                                                                                                         | `@studnicky/pipeline/fsm/interfaces` |
| `PipelineEffectVariantEntity`                  | Defines the `pipeline` effect variant schema.                                                                                                                                           | `@studnicky/pipeline/fsm/entities`   |
| `EffectInterpreter`                            | Executes state-machine effects.                                                                                                                                                         | `@studnicky/fsm/node`                |
| `EffectInterpreterConstructorOptionsInterface` | Defines interpreter construction options.                                                                                                                                               | `@studnicky/fsm/interfaces`          |
| `FsmConfigError`                               | Represents invalid FSM configuration.                                                                                                                                                   | `@studnicky/fsm/node`                |
| `FsmError`                                     | Base error for FSM failures.                                                                                                                                                            | `@studnicky/fsm/node`                |
| `FsmStepInterface`                             | Defines a state-machine transition result.                                                                                                                                              | `@studnicky/fsm/interfaces`          |
| `FsmTransitionInterface`                       | Defines a state-machine transition.                                                                                                                                                     | `@studnicky/fsm/interfaces`          |
| `InterpreterHistory`                           | Retains state-machine transition history.                                                                                                                                               | `@studnicky/fsm/node`                |
| `InterpreterHistoryCollaboratorsInterface`     | Defines the typed clock and handler collaborators `InterpreterHistory.create` accepts alongside schema-validated config; `machine` is a required positional parameter, not a bag field. | `@studnicky/fsm/interfaces`          |
| `InterpreterHistoryRecordInterface`            | Defines a recorded transition.                                                                                                                                                          | `@studnicky/fsm/interfaces`          |
| `InterpreterNotRunningError`                   | Signals work submitted to a stopped interpreter.                                                                                                                                        | `@studnicky/fsm/node`                |
| `InterpreterNotStartedError`                   | Signals work submitted before an interpreter starts.                                                                                                                                    | `@studnicky/fsm/node`                |
| `MachineAlreadyRegisteredError`                | Signals duplicate machine registration.                                                                                                                                                 | `@studnicky/fsm/node`                |
| `MachineRegistry`                              | Manages named state-machine interpreters.                                                                                                                                               | `@studnicky/fsm/node`                |
| `MachineTerminatedError`                       | Signals use of a terminated machine.                                                                                                                                                    | `@studnicky/fsm/node`                |
| `MailboxCapacityExceededError`                 | Signals an interpreter mailbox overflow.                                                                                                                                                | `@studnicky/fsm/node`                |
| `ReducerThrewError`                            | Wraps an error thrown by a reducer.                                                                                                                                                     | `@studnicky/fsm/node`                |
| `RegisteredInterpreterInterface`               | Defines a registered interpreter entry.                                                                                                                                                 | `@studnicky/fsm/interfaces`          |
| `StateMachine`                                 | Defines typed state transitions and effects.                                                                                                                                            | `@studnicky/fsm/node`                |
| `TransitionRejectedError`                      | Signals a rejected state transition.                                                                                                                                                    | `@studnicky/fsm/node`                |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/fsm)
