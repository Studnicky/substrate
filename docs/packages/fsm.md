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

### Define a machine

```typescript
import { StateMachine } from '@studnicky/fsm';
import type { FsmStepType } from '@studnicky/fsm';

type TrafficState =
  | { readonly variant: 'red' }
  | { readonly variant: 'green' }
  | { readonly variant: 'amber' };

type TrafficEvent =
  | { readonly type: 'advance' };

type TrafficEffect =
  | { readonly variant: 'playSound'; readonly tone: string };

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
```

### Run with EffectInterpreter

```typescript
import { EffectInterpreter } from '@studnicky/fsm';
import type { EffectHandlerMapType } from '@studnicky/fsm';

const machine = new TrafficLight();

const handlers: EffectHandlerMapType<TrafficEffect> = {
  playSound: async (effect) => {
    await audioSystem.play(effect.tone);
  },
};

const interpreter = new EffectInterpreter(machine, handlers, { machineId: 'intersection-1' });
interpreter.start();

// Observe state changes
const unsubscribe = interpreter.subscribe((state) => {
  console.log('State:', state.variant);
});

await interpreter.send({ type: 'advance' }); // red → green
await interpreter.send({ type: 'advance' }); // green → amber (plays sound)
await interpreter.send({ type: 'advance' }); // amber → red

interpreter.stop();
unsubscribe();
```

### MachineRegistry — named singleton registry

```typescript
import { MachineRegistry } from '@studnicky/fsm';

MachineRegistry.register('intersection-1', interpreter);

// Later, in another module
const found = MachineRegistry.get('intersection-1');
found?.send({ type: 'advance' });

MachineRegistry.list();         // ['intersection-1']
MachineRegistry.has('x');       // false
MachineRegistry.unregister('intersection-1');
```

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
