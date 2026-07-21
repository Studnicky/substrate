# Changelog

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The package root is the sole public code entrypoint for JSON operations, schemas, interfaces, and package-owned errors, including `FrozenMutationError`.
- `Patch.create(operations?)` is the sole construction and configuration route. Its `operations` projection is deeply isolated from both constructor input and retained patch state.
- `SchemaValidator.compile` exposes the `ValidateFunction` contract owned by `ajv`, while schema declarations and derived types use direct `JSONSchema` and `FromSchema` imports from `json-schema-to-ts`.
- Patch value signatures use `JSONSchema7Type` from `json-schema`, backed by the package's direct `@types/json-schema` dependency.
- `DraftNodeStateEntity`, `PatchApplyResultStatusEntity`, and `PathWildcardResultEntity` own schema-expressible state and status fields composed by JSON runtime interfaces.

## [1.0.0] - 2026-06-22

### Added

- `Clone.deep` / `Clone.shallow` — deep-clone with Map/Set/Date/Array support; shallow spreads a plain-object record.
- `Merge.deep` — V8-monomorphic deep merge; overlay wins on primitives, arrays replaced atomically, objects merged key-wise in alphabetical union order.
- `Path.toAccess` / `Path.get` — convert JSON Pointers to JS access notation and perform proto-pollution-safe dot-path reads with `[*]` wildcard support.
- `Sort.natural` / `Sort.longestFirst` / `Sort.shortestFirst`, `Hash.value`, `StructuralHash.of`, `DataType.deepEqual` / `DataType.isPlainObject` / `DataType.isRecord` / `DataType.hasCycle`, `Frozen.deepFreeze`, and instance-based `Patch` (RFC-6902 add/remove/replace/move/copy/test) with `PatchError`.
