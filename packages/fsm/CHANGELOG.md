# Changelog

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

- `InterpreterHistory<TState, TEvent, TEffect>` — a bounded recorder of an `EffectInterpreter`'s own transitions. Subclasses `EffectInterpreter`, overriding `onTransition` to push a `{ event, from, to, timestamp }` record into an internal `@studnicky/circular-buffer` ring. `InterpreterHistory.create({ capacity, machine, handlers?, machineId? })` mirrors `EffectInterpreter.create`'s validation, plus a required positive-integer `capacity`. `history()` returns a snapshot array, oldest first, bounded to `capacity`.
- `TransitionRejectedError` — thrown by a reducer to deliberately reject an event as invalid business logic. `StateMachine#transition()` re-throws it as-is (not wrapped in `ReducerThrewError`), so callers can `instanceof`-check it to distinguish a deliberate rejection from an actual reducer defect.
- `MachineTerminatedError` and `StateMachine#isTerminated()` / `StateMachine#onTerminatedAccess()` hooks — mark specific state variants as terminal. `transition()` throws `MachineTerminatedError` before `reduce()` is invoked once a state is terminated.
- Effect handlers in `EffectHandlerMapType<TEffect, TEvent>` now receive a `dispatch(event: TEvent) => void` second argument. Calling it enqueues a follow-up event at the front of the interpreter's mailbox, processed within the same `send()` call. Non-breaking for handlers that ignore the second argument.

### Changed

- `EffectInterpreter` construction uses `EffectInterpreter.create({ machine, handlers?, machineId? })` and `EffectInterpreter.builder()` factory methods. Constructor is protected; direct `new EffectInterpreter(...)` from outside the class is no longer accessible.
- `StateMachine` abstract base has a protected constructor for uniformity; concrete subclasses funnel through it.
- `EffectInterpreterBuilder` exported from the package barrel.
- **Breaking:** `MachineRegistry` is instantiable, matching every other primitive in this package. Create an instance with `MachineRegistry.create()`; `register`/`unregister`/`get`/`has`/`list` are now instance methods, and `onRegister`/`onUnregister`/`onResolveMiss` are protected instance hooks (no longer `static`). Each instance owns its own registry — nothing is process-wide anymore.

## [1.0.0] - 2026-06-22

### Added

- `StateMachine` abstract base class with `transition()` wrapper and `ReducerThrewError`
- `EffectInterpreter` with async FIFO mailbox, observer subscriptions, and effect dispatch
- `MachineRegistry` module-singleton for name-based interpreter lookup
