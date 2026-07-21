# Changelog

## 8.0.0

### Major Changes

- 837480d: `InterpreterHistory<TState, TEvent, TEffect>` — bounded, single-interpreter observability built on `EffectInterpreter.onTransition` and `@studnicky/circular-buffer`. `InterpreterHistory.create({ capacity, machine, handler?, machineId? })` forwards the optional singular handler and requires a positive-integer capacity. Variant-changing transitions produce readonly `{ event, from, to, timestamp }` records; same-variant sends are absent. `history()` returns a fresh isolated, oldest-first snapshot and evicts the oldest record when capacity is full.

  `TransitionRejectedError` — thrown by a reducer to deliberately reject an event as invalid business logic. `StateMachine#transition()` re-throws it as-is (not wrapped in `ReducerThrewError`), so callers can `instanceof`-check it to distinguish a deliberate rejection from an actual reducer defect.

  `MachineTerminatedError` and `StateMachine#isTerminated()` / `StateMachine#onTerminatedAccess()` hooks — mark specific state variants as terminal. `transition()` throws `MachineTerminatedError` before `reduce()` is invoked once a state is terminated.

  `EffectHandlerInterface<TEffect, TEvent>` receives an effect and a `dispatch(event: TEvent) => void` capability. Calling `dispatch` enqueues a follow-up event at the front of the interpreter's mailbox for the current `send()` drain.

  The package root is the sole public code entrypoint for state-machine, interpreter, registry, error, and interface contracts.

  `EffectInterpreter.create({ machine, handler?, machineId?, mailboxCapacity? })` supports singular effect-handler configuration.

  `StateMachine` abstract base has a protected constructor for uniformity; concrete subclasses funnel through it.

  `MachineRegistry.create()` creates an independent registry. `register`, `unregister`, `get`, `has`, and `list` are instance methods, and `onRegister`, `onUnregister`, and `onResolveMiss` are protected instance hooks.

  Pure state, event, and effect data compose from entity-derived types. `InterpreterHistoryRecordMetadataEntity` owns record timestamps, `RegisteredInterpreterMetricsEntity` owns hook-error counts, and history capacity composes from `CircularBufferOptionsEntity`; the interfaces retain generic, readonly, callable, and runtime contracts.

- 837480d: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

### Patch Changes

- Updated dependencies [837480d]
- Updated dependencies [837480d]
- Updated dependencies [837480d]
- Updated dependencies [837480d]
  - @studnicky/circular-buffer@8.0.0
  - @studnicky/errors@8.0.0
  - @studnicky/json@8.0.0

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

## [1.0.0] - 2026-06-22

### Added

- `StateMachine` abstract base class with `transition()` wrapper and `ReducerThrewError`
- `EffectInterpreter` with async FIFO mailbox, observer subscriptions, and effect dispatch
- `MachineRegistry` for name-based interpreter lookup
