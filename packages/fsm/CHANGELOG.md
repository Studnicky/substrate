# Changelog

## 10.0.0

### Patch Changes

- Updated dependencies [3e5575a]
  - @studnicky/errors@10.0.0
  - @studnicky/json@10.0.0
  - @studnicky/circular-buffer@10.0.0

## 9.2.0

### Patch Changes

- Version bump only — no functional changes. Released in lockstep with the fixed-package group.

## 9.1.1

### Patch Changes

- @studnicky/circular-buffer@9.1.1
- @studnicky/errors@9.1.1
- @studnicky/json@9.1.1

## 9.1.0

### Minor Changes

- 789da06: ### Added

  - `EffectInterpreterConstructorOptionsInterface` is exported from `@studnicky/fsm`. A subclass that declares its own constructor needs this type to annotate the parameter it forwards to `super()`, and it was previously module-local — leaving the documented extension path unnameable from outside the package. It differs from the shape `create()` accepts in one respect: `machine` is required, because `create()` validates the caller's optional value and throws before the constructor runs.

### Patch Changes

- 789da06: ### Changed

  - `@studnicky/fsm`'s `.loop.spec.ts` suites construct every locally-defined `StateMachine` subclass through a small explicitly-typed factory (or a subclass-declared public constructor) instead of an inline `new Xxx()`, so `EffectInterpreter.create`/`InterpreterHistory.create`/`MachineRegistry`'s generic parameters infer correctly instead of collapsing to `unknown`. `InterpreterHistory.loop.spec.ts`, `MachineRegistry.loop.spec.ts`, `MachineRegistryHooks.loop.spec.ts`, `StateMachine.loop.spec.ts`, and `StateMachineHooks.loop.spec.ts` retype their scenario `runnerMap`s as per-shape mapped types (`{ [K in Shape]: (c: Extract<ScenarioCase, { shape: K }>) => ... }`) so each handler narrows to its own scenario case instead of the full union; `InterpreterHistory`'s and `StateMachine`'s scenario types split every shape field that held more than one literal into its own discriminated-union member. `StateMachine.loop.spec.ts` gains a `PlainErrorThrowingMachine` covering the non-`Error` reducer-throw path with its own `expectedReason` assertion.
  - `@studnicky/mutex`'s `coalescing.loop.spec.ts`, `fsm.loop.spec.ts`, `reentrancy.loop.spec.ts`, `observability.loop.spec.ts`, and `mutex-core.loop.spec.ts` apply the same per-shape `runnerMap` narrowing; `coalescing.loop.spec.ts`'s combined `stats-coalescedCount-enabled`/`-disabled` case becomes two discriminated members. Array-index and settled-promise accesses that could be `undefined` now go through explicit guards instead of relying on ambient narrowing. `tests/fixtures/constants.ts` imports `MutexConfigEntity` from its real path instead of a `MutexConfigInterface` module that never existed. `examples/observedMutex.ts`'s `TracingMutex.create()` call drops an explicit `<string>` type argument that was defeating `this`-polymorphic inference and returning the base `Mutex` type; `examples/keyedWorkGateComposition.ts`'s `runExclusive` call supplies a type-predicate guard so its result narrows to `string`.
  - All touched `.loop.spec.ts`/example files pick up the `with { type: 'json' }` import attribute their JSON scenario imports need under the stricter test typecheck.

- 789da06: ### Fixed

  - `logger`'s `Logger.scenarios.json` suite and `Logger.loop.spec.ts` drop the `expected.asserted: true` tautology from every case — each case's preceding behavioral assertions already prove the scenario. `LogEventName`'s `component-prefixes` case drops the redundant self-comparison of `input.components` against `expected.components` (and now also asserts `EVENT_COMPONENTS.TIMING`, the one component prefix the case previously left unchecked). `LogStatus.scenarios.json` drops the `input.values` field, which duplicated `expected.values` and was never read by the spec.
  - `circular-buffer`'s `CircularBuffer.scenarios.json` drops `shift-never-pushed-returns-undefined`, a verbatim duplicate of `shift-empty-returns-undefined`. `CircularBuffer.subclass.scenarios.json`'s `onEvict-called-with-evicted-item` now drives a longer five-push eviction chain distinct from `create-returns-subclass`, proving FIFO eviction order across three evictions instead of duplicating the same single-eviction fixture.
  - `fsm`'s `plain-error-wraps` scenario now throws a non-`Error` primitive from the reducer and asserts the resulting `ReducerThrewError`'s `cause` and the hook-observed `reason` string, exercising `StateMachine`'s `String(cause)` fallback — previously indistinguishable from `wraps-reducer-throw`, which throws a real `Error` and only exercised the `cause.message` branch.
  - `file-lock`'s `entities.scenarios.json` adds coverage for `FileLockOptionsEntity`'s previously-unexercised rejection branches: empty `path`, non-positive `pollMs`/`timeoutMs`, and an unexpected extra property under `additionalProperties: false`.
  - `timing`'s `immediate-operations` spec drops its upper-bound assertions (`durationMs < 5`, event elapsed `< 5`) taken from two back-to-back `process.hrtime()` reads with no busy-wait spacer — the fragile direction under load. It now asserts non-negativity only, matching every sibling case's lower-bound-only pattern.
  - `scheduler`'s `chained-timeout-fire` and `chained-timeout-cancel` specs no longer arm real `setTimeout` stages against a fixed wall-clock buffer. They drive `RealTimeScheduler`'s multi-stage chain deterministically via `node:test`'s `mock.timers` (mocking `Date` and `setTimeout`), ticking virtual time forward one `maxTimeoutDelayMs` stage at a time and cancelling mid-chain, eliminating the wall-clock margin entirely rather than widening it.

- 789da06: ### Fixed

  - Every `*.scenarios.json` import across the test suites carries the `with { type: 'json' }` import attribute `module: NodeNext` requires, clearing 221 `TS1543` diagnostics that `tsc -b` never surfaced because test files aren't part of any package's typechecked build — only `tsconfig.eslint.json` (used for ESLint's type-aware rules) sees them, and it consumes type information without reporting `TS` diagnostics on its own.
  - Tests that constructed a `protected`-constructor class directly with `new` now call the class's `this`-polymorphic static factory instead (`Subclass.create(...)`), clearing 78 `TS2674` diagnostics across `Clock`, `Channel`, `Coalesce`, `EntityStore`, `CircuitBreaker`, `EventBus`, `Mutex`, and `RealTimeScheduler` subclasses. The remaining 86 `TS2674` instances are left on `new` because no fitting factory exists for that call site: `StateMachine` is abstract with no static factory at all; `EffectInterpreter`, `InterpreterHistory`, `DeadLetterQueue`, `Signal`, `FetchClient`, and `ErrorClassifier`'s factories (where one exists) hardcode their own class rather than accepting `this`, so calling them on a subclass returns the base type instead of the subclass; and `Channel`/`Coalesce` subclasses that are themselves generic and expose subclass-only members lose that member's type through the factory's necessarily looser `TInstance` bound, so the direct constructor call is correct as written.

- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
  - @studnicky/circular-buffer@9.1.0
  - @studnicky/errors@9.1.0
  - @studnicky/json@9.1.0

## 9.0.0

### Major Changes

- d5be000: `InterpreterHistory<TState, TEvent, TEffect>` — bounded, single-interpreter observability built on `EffectInterpreter.onTransition` and `@studnicky/circular-buffer`. `InterpreterHistory.create({ capacity, machine, handler?, machineId? })` forwards the optional singular handler and requires a positive-integer capacity. Variant-changing transitions produce readonly `{ event, from, to, timestamp }` records; same-variant sends are absent. `history()` returns a fresh isolated, oldest-first snapshot and evicts the oldest record when capacity is full.

  `TransitionRejectedError` — thrown by a reducer to deliberately reject an event as invalid business logic. `StateMachine#transition()` re-throws it as-is (not wrapped in `ReducerThrewError`), so callers can `instanceof`-check it to distinguish a deliberate rejection from an actual reducer defect.

  `MachineTerminatedError` and `StateMachine#isTerminated()` / `StateMachine#onTerminatedAccess()` hooks — mark specific state variants as terminal. `transition()` throws `MachineTerminatedError` before `reduce()` is invoked once a state is terminated.

  `EffectHandlerInterface<TEffect, TEvent>` receives an effect and a `dispatch(event: TEvent) => void` capability. Calling `dispatch` enqueues a follow-up event at the front of the interpreter's mailbox for the current `send()` drain.

  The package root is the sole public code entrypoint for state-machine, interpreter, registry, error, and interface contracts.

  `EffectInterpreter.create({ machine, handler?, machineId?, mailboxCapacity? })` supports singular effect-handler configuration.

  `StateMachine` abstract base has a protected constructor for uniformity; concrete subclasses funnel through it.

  `MachineRegistry.create()` creates an independent registry. `register`, `unregister`, `get`, `has`, and `list` are instance methods, and `onRegister`, `onUnregister`, and `onResolveMiss` are protected instance hooks.

  Pure state, event, and effect data compose from entity-derived types. `InterpreterHistoryRecordMetadataEntity` owns record timestamps, `RegisteredInterpreterMetricsEntity` owns hook-error counts, and history capacity composes from `CircularBufferOptionsEntity`; the interfaces retain generic, readonly, callable, and runtime contracts.

- d5be000: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

### Patch Changes

- Updated dependencies [d5be000]
- Updated dependencies [d5be000]
- Updated dependencies [d5be000]
- Updated dependencies [d5be000]
  - @studnicky/circular-buffer@9.0.0
  - @studnicky/errors@9.0.0
  - @studnicky/json@9.0.0

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.
- Updated dependencies
  - @studnicky/circular-buffer@8.0.1
  - @studnicky/errors@8.0.1
  - @studnicky/json@8.0.1

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
