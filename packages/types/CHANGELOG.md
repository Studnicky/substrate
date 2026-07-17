# Changelog

## 7.0.0

### Minor Changes

- d2b44b7: `@studnicky/types` exports `PickDefined.from(record)`, which strips `undefined`-valued keys from a record while narrowing each remaining value's type away from `undefined` — built for builders assembling an options object from a mix of required and optional fields.

  `@studnicky/errors` exports `DomainErrorArgs.build(fields, options)`, which computes `code`/`message`/`retryable`/`cause`/`correlationId`/`metadata` for a `super()` call so leaf error classes can skip the manual field-assignment ceremony while keeping their `extends` chain and `instanceof` checks intact.

  `@studnicky/logger` exports `ResolveMinLevel.from(options)`, the level-validation-and-resolution logic `ConsoleTransport`/`MemoryTransport` already use internally, now reusable by third-party `TransportInterface` implementations.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Wire` pure-static class with six type-safe accessors (`isRecord`, `asRecord`, `asString`, `asNumber`, `asStringOrNull`, `asRecordArray`) for narrowing `unknown` wire-format values without unsafe assertions
- `JsonValue`, `JsonObject` compile-time types for recursive readonly JSON-safe values and unvalidated JSON objects
- `DeepReadonly<T>` and `DeepMergeType<TBase, TOverlay>` generic utility types for recursive immutability and type-level deep merging
- `JsonSchema`, `JsonSchemaObject`, and `JsonSchemaTypeName` compile-time types modelling the JSON Schema 2020-12 vocabulary
