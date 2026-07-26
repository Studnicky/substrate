---
"@studnicky/batch": patch
"@studnicky/boundary-kit": patch
"@studnicky/bounded-dispatcher": patch
"@studnicky/circular-buffer": patch
"@studnicky/clock": patch
"@studnicky/concurrency": patch
"@studnicky/config": patch
"@studnicky/context": patch
"@studnicky/entity-store": patch
"@studnicky/errors": patch
"@studnicky/eslint-config": patch
"@studnicky/event-bus": patch
"@studnicky/fetch": patch
"@studnicky/file-lock": patch
"@studnicky/flag-evaluator": patch
"@studnicky/fsm": patch
"@studnicky/health-registry": patch
"@studnicky/idempotency-guard": patch
"@studnicky/json": patch
"@studnicky/keyed-rate-limiter": patch
"@studnicky/keyed-work-gate": patch
"@studnicky/logger": patch
"@studnicky/mutex": patch
"@studnicky/pipeline": patch
"@studnicky/predicates": patch
"@studnicky/process-kit": patch
"@studnicky/request-executor": patch
"@studnicky/resilience": patch
"@studnicky/retry": patch
"@studnicky/sample-buffer": patch
"@studnicky/scheduler": patch
"@studnicky/signal": patch
"@studnicky/sliding-window-limiter": patch
"@studnicky/system": patch
"@studnicky/throttle": patch
"@studnicky/timing": patch
"@studnicky/types": patch
"@studnicky/visible-range": patch
"@studnicky/worker-pool": patch
---

### Fixed

- Every `*.scenarios.json` import across the test suites carries the `with { type: 'json' }` import attribute `module: NodeNext` requires, clearing 221 `TS1543` diagnostics that `tsc -b` never surfaced because test files aren't part of any package's typechecked build — only `tsconfig.eslint.json` (used for ESLint's type-aware rules) sees them, and it consumes type information without reporting `TS` diagnostics on its own.
- Tests that constructed a `protected`-constructor class directly with `new` now call the class's `this`-polymorphic static factory instead (`Subclass.create(...)`), clearing 78 `TS2674` diagnostics across `Clock`, `Channel`, `Coalesce`, `EntityStore`, `CircuitBreaker`, `EventBus`, `Mutex`, and `RealTimeScheduler` subclasses. The remaining 86 `TS2674` instances are left on `new` because no fitting factory exists for that call site: `StateMachine` is abstract with no static factory at all; `EffectInterpreter`, `InterpreterHistory`, `DeadLetterQueue`, `Signal`, `FetchClient`, and `ErrorClassifier`'s factories (where one exists) hardcode their own class rather than accepting `this`, so calling them on a subclass returns the base type instead of the subclass; and `Channel`/`Coalesce` subclasses that are themselves generic and expose subclass-only members lose that member's type through the factory's necessarily looser `TInstance` bound, so the direct constructor call is correct as written.
