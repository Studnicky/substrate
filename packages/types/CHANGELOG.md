# Changelog

## 8.0.0

### Major Changes

- 837480d: The package root is the sole code entrypoint for every runtime helper. `JsonValue.is` and `JsonValue.from` use `JSONSchema7Type` from its owner module, `json-schema`; `@types/json-schema` supplies the package's direct declaration dependency. The package exports runtime helpers only: `Empty`, `Guard`, `JsonObject`, `JsonValue`, and `PickDefined`.
- 837480d: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

## 7.0.1

## 7.0.0

### Minor Changes

- d2b44b7: `@studnicky/types` exports `PickDefined.from(record)`, which strips `undefined`-valued keys from a record while narrowing each remaining value's type away from `undefined` — built for builders assembling an options object from a mix of required and optional fields.

  `@studnicky/errors` exports `DomainErrorArgs.build(fields, options)`, which computes `code`, `message`, `retryable`, `cause`, `correlationId`, and `metadata` for a `super()` call while preserving the leaf error's `extends` chain and `instanceof` behavior.

  `@studnicky/logger` exports `ResolveMinLevel.from(options)` for the level validation and resolution shared by built-in and third-party `TransportInterface` implementations.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Guard` pure-static runtime accessors and predicates for narrowing `unknown` values.
- `JsonObject` and `JsonValue` runtime boundaries for plain objects and recursive JSON-compatible values.
