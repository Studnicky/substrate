# @studnicky/fsm

> Type-safe abstract FSM base class with async effect interpretation and named machine registry.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/fsm)

A lightweight finite state machine foundation built on a pure reducer model. Extend `StateMachine` to define entity-derived states, events, and effect descriptors. Drive the machine with `EffectInterpreter`, which serialises concurrent events through an internal mailbox and invokes one optional effect handler after each transition. `MachineRegistry` provides an instantiable named store for sharing interpreter instances across modules.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/fsm
```

## Usage

Application state, event, and effect data come from application-owned entities. Runtime, callable, readonly, and generic contracts come from the package interfaces.

```typescript
import type { EffectHandlerInterface, FsmStepInterface } from '@studnicky/fsm';
import type { TrafficEffectEntity } from './entities/TrafficEffectEntity.js';
import type { TrafficEventEntity } from './entities/TrafficEventEntity.js';
import type { TrafficStateEntity } from './entities/TrafficStateEntity.js';

import { EffectInterpreter, MachineRegistry, StateMachine } from '@studnicky/fsm';

class TrafficLight extends StateMachine<
  TrafficStateEntity.Type,
  TrafficEventEntity.Type,
  TrafficEffectEntity.Type
> {
  static create(): TrafficLight {
    return new TrafficLight();
  }

  getInitialState(): TrafficStateEntity.Type {
    return { variant: 'red' };
  }

  reduce(
    state: TrafficStateEntity.Type,
    event: TrafficEventEntity.Type
  ): FsmStepInterface<TrafficStateEntity.Type, TrafficEffectEntity.Type> {
    if (event.type === 'advance' && state.variant === 'red') {
      return { state: { variant: 'green' }, effects: [] };
    }
    if (event.type === 'advance' && state.variant === 'green') {
      return {
        state: { variant: 'amber' },
        effects: [{ variant: 'playSound', tone: 'chime' }]
      };
    }
    if (event.type === 'advance' && state.variant === 'amber') {
      return { state: { variant: 'red' }, effects: [] };
    }
    return { state, effects: [] };
  }
}

const machine = TrafficLight.create();
const handler: EffectHandlerInterface<
  TrafficEffectEntity.Type,
  TrafficEventEntity.Type
> = async (effect) => {
  console.log(`Playing tone: ${effect.tone}`);
};

const interpreter = EffectInterpreter.create({
  machine,
  handler,
  machineId: 'intersection-1'
});

interpreter.start();
await interpreter.send({ type: 'advance' });
await interpreter.send({ type: 'advance' });

const registry = MachineRegistry.create<
  TrafficStateEntity.Type,
  TrafficEventEntity.Type
>();
registry.register('intersection-1', interpreter);
const found = registry.get('intersection-1');
registry.unregister('intersection-1');
```

The singular `EffectHandlerInterface` receives every effect and can discriminate on `effect.variant`. Configure it through `EffectInterpreter.create({ machine, handler })`.

## Extending

Subclass `StateMachine` and implement `getInitialState` and `reduce`. Both methods are pure: effects remain entity-derived values in `FsmStepInterface.effects`, and the interpreter invokes the configured handler only after the state transition completes.

```typescript
import type { FsmStepInterface } from '@studnicky/fsm';
import type { MyEffectEntity } from './entities/MyEffectEntity.js';
import type { MyEventEntity } from './entities/MyEventEntity.js';
import type { MyStateEntity } from './entities/MyStateEntity.js';

import { StateMachine } from '@studnicky/fsm';

class MyMachine extends StateMachine<
  MyStateEntity.Type,
  MyEventEntity.Type,
  MyEffectEntity.Type
> {
  static create(): MyMachine {
    return new MyMachine();
  }

  getInitialState(): MyStateEntity.Type {
    return { variant: 'idle' };
  }

  reduce(
    state: MyStateEntity.Type,
    event: MyEventEntity.Type
  ): FsmStepInterface<MyStateEntity.Type, MyEffectEntity.Type> {
    return { state, effects: [] };
  }
}
```

## Rejecting a transition deliberately

`reduce()` is the single source of truth for transition logic. Throw `TransitionRejectedError` from `reduce()` when an event is invalid business logic. `transition()` fires `onTransitionRejected(state, event, reason)` and rethrows that error as-is. Any other reducer throw is wrapped in `ReducerThrewError`.

```typescript
import { TransitionRejectedError } from '@studnicky/fsm';

if (state.variant === 'idle' && event.type === 'withdraw') {
  throw new TransitionRejectedError({
    eventType: event.type,
    reason: 'insufficient balance',
    stateVariant: state.variant
  });
}
```

## Terminal states

Override `isTerminated(state)` to mark final state variants. `transition()` throws `MachineTerminatedError` before invoking `reduce()` for a terminated state.

```typescript
protected override isTerminated(state: MyStateEntity.Type): boolean {
  return state.variant === 'closed';
}
```

## Dispatching follow-up events from effects

The handler’s `dispatch(event)` capability puts a follow-up event at the front of the current mailbox drain. Configure it directly on the interpreter:

```typescript
import type { EffectHandlerInterface } from '@studnicky/fsm';

const handler: EffectHandlerInterface<
  MyEffectEntity.Type,
  MyEventEntity.Type
> = (effect, dispatch) => {
  if (effect.variant === 'scheduleRetry') {
    dispatch({ type: 'retry', attempt: effect.attempt + 1 });
  }
};

const interpreter = EffectInterpreter.create({ machine, handler });
```

## Recording transition history

`InterpreterHistory` adds bounded, single-interpreter observability to `EffectInterpreter`. It forwards the same optional singular handler and records each variant-changing `onTransition` event:

```typescript
import { InterpreterHistory } from '@studnicky/fsm';

const history = InterpreterHistory.create({
  capacity: 50,
  machine,
  handler,
  machineId: 'intersection-1'
});

history.start();
await history.send({ type: 'advance' });

for (const record of history.history()) {
  console.log(record.from.variant, record.event.type, record.to.variant, record.timestamp);
}
```

Each `InterpreterHistoryRecordInterface<TState, TEvent>` contains the event, previous state, next state, and timestamp. `history()` returns a fresh readonly, oldest-first snapshot isolated from later transitions. The internal ring retains at most `capacity` records and evicts the oldest record when full. Successful sends that keep the same state variant are absent because `InterpreterHistory` follows `EffectInterpreter.onTransition` semantics.

`InterpreterHistoryRecordMetadataEntity` owns the schema-derived timestamp field, and `RegisteredInterpreterMetricsEntity` owns the schema-derived hook-error count. FSM interfaces compose those fields while retaining their generic state, event, and callable members. History capacity uses `CircularBufferOptionsEntity.Type['capacity']` directly from `@studnicky/circular-buffer`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/fsm

## License

MIT
