# @studnicky/fsm

> Type-safe abstract FSM base class with async effect interpretation and named machine registry.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/fsm)

A lightweight finite state machine foundation built on a pure reducer model. Extend `StateMachine` to define states, events, and side-effect descriptors. Drive the machine at runtime with `EffectInterpreter`, which serialises concurrent events through an internal mailbox and dispatches effects asynchronously after each transition. `MachineRegistry` provides an instantiable named store — create one with `MachineRegistry.create()` — for sharing interpreter instances across modules without prop drilling.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/fsm
```

## Usage

```typescript
import { StateMachine, EffectInterpreter, MachineRegistry } from '@studnicky/fsm';
import type { FsmStepType, EffectHandlerMapType } from '@studnicky/fsm';

type TrafficState =
  | { readonly variant: 'red' }
  | { readonly variant: 'green' }
  | { readonly variant: 'amber' };

type TrafficEvent = { readonly type: 'advance' };

type TrafficEffect = { readonly variant: 'playSound'; readonly tone: string };

class TrafficLight extends StateMachine<TrafficState, TrafficEvent, TrafficEffect> {
  getInitialState(): TrafficState {
    return { variant: 'red' };
  }

  reduce(state: TrafficState, event: TrafficEvent): FsmStepType<TrafficState, TrafficEffect> {
    if (event.type === 'advance') {
      if (state.variant === 'red')   return { state: { variant: 'green' }, effects: [] };
      if (state.variant === 'green') return { state: { variant: 'amber' }, effects: [{ variant: 'playSound', tone: 'chime' }] };
      if (state.variant === 'amber') return { state: { variant: 'red' }, effects: [] };
    }
    return { state, effects: [] };
  }
}

const machine = new TrafficLight();

const handlers: EffectHandlerMapType<TrafficEffect> = {
  playSound: async (effect) => {
    console.log(`Playing tone: ${effect.tone}`);
  },
};

const interpreter = EffectInterpreter.create({ machine, handlers, machineId: 'intersection-1' });
// or via builder:
// const interpreter = EffectInterpreter.builder<TrafficState, TrafficEvent, TrafficEffect>()
//   .withMachine(machine)
//   .withHandlers(handlers)
//   .withOptions({ machineId: 'intersection-1' })
//   .build();
interpreter.start();

const unsubscribe = interpreter.subscribe((state) => {
  console.log('State:', state.variant);
});

await interpreter.send({ type: 'advance' }); // red → green
await interpreter.send({ type: 'advance' }); // green → amber (plays sound)
await interpreter.send({ type: 'advance' }); // amber → red

interpreter.stop();
unsubscribe();

// Register for cross-module access — create an instance, don't rely on a
// process-wide singleton.
const registry = MachineRegistry.create();
registry.register('intersection-1', interpreter);
const found = registry.get('intersection-1');
registry.unregister('intersection-1');
```

## Extending

Subclass `StateMachine` and implement `getInitialState` and `reduce` to define the machine's behaviour. Both methods must be pure — no side effects. Side effects are modelled as values returned in the `effects` array of `FsmStepType` and dispatched by `EffectInterpreter` via the handler map after the state transition completes.

```typescript
import { StateMachine } from '@studnicky/fsm';
import type { FsmStepType } from '@studnicky/fsm';

class MyMachine extends StateMachine<MyState, MyEvent, MyEffect> {
  getInitialState(): MyState {
    return { variant: 'idle' };
  }

  reduce(state: MyState, event: MyEvent): FsmStepType<MyState, MyEffect> {
    // Return next state and any effects to dispatch
    return { state, effects: [] };
  }
}
```

## Rejecting a transition deliberately

`reduce()` is the single source of truth for the transition algebra — there is no separate guard/`canTransition()` pre-check. To reject an event as invalid business logic (rather than signal a reducer defect), throw `TransitionRejectedError` from within `reduce()`:

```typescript
import { StateMachine, TransitionRejectedError, ReducerThrewError } from '@studnicky/fsm';
import type { FsmStepType } from '@studnicky/fsm';

class MyMachine extends StateMachine<MyState, MyEvent, MyEffect> {
  getInitialState(): MyState {
    return { variant: 'idle' };
  }

  reduce(state: MyState, event: MyEvent): FsmStepType<MyState, MyEffect> {
    if (state.variant === 'idle' && event.type === 'withdraw') {
      throw new TransitionRejectedError({
        eventType: event.type,
        reason: 'insufficient balance',
        stateVariant: state.variant,
      });
    }
    return { state, effects: [] };
  }
}
```

`transition()` still fires `onTransitionRejected(state, event, reason)` for any thrown value, but re-throws `TransitionRejectedError` as-is. Callers can `instanceof`-check the result to distinguish a deliberate rejection from an actual reducer bug (any other thrown value is wrapped as `ReducerThrewError`, unchanged from before):

```typescript
try {
  machine.transition(state, event);
} catch (err) {
  if (err instanceof TransitionRejectedError) {
    // expected business-logic rejection
  } else if (err instanceof ReducerThrewError) {
    // reducer defect
  }
}
```

## Terminal states

Override `isTerminated(state)` to mark specific state variants as final. Once a state is terminated, `transition()` throws `MachineTerminatedError` before `reduce()` is invoked at all:

```typescript
import { StateMachine, MachineTerminatedError } from '@studnicky/fsm';
import type { FsmStepType } from '@studnicky/fsm';

class MyMachine extends StateMachine<MyState, MyEvent, MyEffect> {
  getInitialState(): MyState {
    return { variant: 'idle' };
  }

  reduce(state: MyState, event: MyEvent): FsmStepType<MyState, MyEffect> {
    return { state, effects: [] };
  }

  protected override isTerminated(state: MyState): boolean {
    return state.variant === 'closed';
  }

  protected override onTerminatedAccess(state: MyState, event: MyEvent): void {
    // observe the illegal access before MachineTerminatedError is thrown
  }
}
```

## Effect handlers dispatching follow-up events

Effect handlers receive a `dispatch(event)` capability as their second argument. Calling it enqueues a new event at the front of the mailbox, so it is processed before any events queued behind the current one — within the same `send()` call:

```typescript
const handlers: EffectHandlerMapType<MyEffect, MyEvent> = {
  scheduleRetry: (effect, dispatch) => {
    dispatch({ type: 'retry', attempt: effect.attempt + 1 });
  },
};
```

Handlers that ignore the second argument are unaffected — this is non-breaking for existing handler signatures.

## Recording transition history

`InterpreterHistory` is a bounded recorder of an `EffectInterpreter`'s own transitions — a strict superset of `EffectInterpreter` (start/send/stop work identically) that also exposes `history()`:

```typescript
import { InterpreterHistory } from '@studnicky/fsm';

const history = InterpreterHistory.create({ capacity: 50, machine, handlers, machineId: 'intersection-1' });
history.start();

await history.send({ type: 'advance' });
await history.send({ type: 'advance' });

for (const record of history.history()) {
  console.log(`${record.from.variant} --[${record.event.type}]--> ${record.to.variant} @ ${record.timestamp}`);
}
```

`history()` returns a snapshot array (not the live internal buffer) of `{ event, from, to, timestamp }` records, oldest first, bounded to the configured `capacity` — once full, the oldest record is dropped as new transitions arrive.
