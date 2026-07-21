---
"@studnicky/batch": major
"@studnicky/boundary-kit": major
"@studnicky/bounded-dispatcher": major
"@studnicky/cache": major
"@studnicky/circular-buffer": major
"@studnicky/clock": major
"@studnicky/concurrency": major
"@studnicky/config": major
"@studnicky/context": major
"@studnicky/entity-store": major
"@studnicky/errors": major
"@studnicky/eslint-config": major
"@studnicky/event-bus": major
"@studnicky/fetch": major
"@studnicky/file-lock": major
"@studnicky/flag-evaluator": major
"@studnicky/fsm": major
"@studnicky/health-registry": major
"@studnicky/idempotency-guard": major
"@studnicky/json": major
"@studnicky/keyed-rate-limiter": major
"@studnicky/keyed-work-gate": major
"@studnicky/logger": major
"@studnicky/memoize": major
"@studnicky/mutex": major
"@studnicky/paginator": major
"@studnicky/pipeline": major
"@studnicky/predicates": major
"@studnicky/process-kit": major
"@studnicky/request-executor": major
"@studnicky/resilience": major
"@studnicky/retry": major
"@studnicky/sample-buffer": major
"@studnicky/scheduler": major
"@studnicky/signal": major
"@studnicky/sliding-window-limiter": major
"@studnicky/system": major
"@studnicky/throttle": major
"@studnicky/timing": major
"@studnicky/types": major
"@studnicky/virtual-fs": major
"@studnicky/visible-range": major
"@studnicky/worker-pool": major
---

This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

`HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

`Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

`Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.
