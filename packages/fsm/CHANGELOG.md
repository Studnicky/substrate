# Changelog

## 7.0.1

### Patch Changes

- @studnicky/circular-buffer@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/circular-buffer@7.0.0
  - @studnicky/json@7.0.0

## [Unreleased]

### Added

- `InterpreterHistory<TState, TEvent, TEffect>` — bounded, single-interpreter observability built on `EffectInterpreter.onTransition` and `@studnicky/circular-buffer`. `InterpreterHistory.create({ capacity, machine, handler?, machineId? })` forwards the optional singular handler and requires a positive-integer capacity. Variant-changing transitions produce readonly `{ event, from, to, timestamp }` records; same-variant sends are absent. `history()` returns a fresh isolated, oldest-first snapshot and evicts the oldest record when capacity is full.
- `TransitionRejectedError` — thrown by a reducer to deliberately reject an event as invalid business logic. `StateMachine#transition()` re-throws it as-is (not wrapped in `ReducerThrewError`), so callers can `instanceof`-check it to distinguish a deliberate rejection from an actual reducer defect.
- `MachineTerminatedError` and `StateMachine#isTerminated()` / `StateMachine#onTerminatedAccess()` hooks — mark specific state variants as terminal. `transition()` throws `MachineTerminatedError` before `reduce()` is invoked once a state is terminated.
- `EffectHandlerInterface<TEffect, TEvent>` receives an effect and a `dispatch(event: TEvent) => void` capability. Calling `dispatch` enqueues a follow-up event at the front of the interpreter's mailbox for the current `send()` drain.

### Changed

- The package root is the sole public code entrypoint for state-machine, interpreter, registry, error, and interface contracts.
- `EffectInterpreter.create({ machine, handler?, machineId?, mailboxCapacity? })` supports singular effect-handler configuration.
- `StateMachine` abstract base has a protected constructor for uniformity; concrete subclasses funnel through it.
- `MachineRegistry.create()` creates an independent registry. `register`, `unregister`, `get`, `has`, and `list` are instance methods, and `onRegister`, `onUnregister`, and `onResolveMiss` are protected instance hooks.
- Pure state, event, and effect data compose from entity-derived types. `InterpreterHistoryRecordMetadataEntity` owns record timestamps, `RegisteredInterpreterMetricsEntity` owns hook-error counts, and history capacity composes from `CircularBufferOptionsEntity`; the interfaces retain generic, readonly, callable, and runtime contracts.

## [1.0.0] - 2026-06-22

### Added

- `StateMachine` abstract base class with `transition()` wrapper and `ReducerThrewError`
- `EffectInterpreter` with async FIFO mailbox, observer subscriptions, and effect dispatch
- `MachineRegistry` for name-based interpreter lookup
