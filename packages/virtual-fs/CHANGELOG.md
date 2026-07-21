# @studnicky/virtual-fs

## [Unreleased]

### Changed

- `EntryEntity.Type` is the schema-derived filesystem entry data. `VirtualFileSystemOptionsInterface`, `FileSystemInterface`, and `StatResultInterface` define runtime and readonly contracts.
- `@studnicky/virtual-fs` is the sole public code entrypoint.

## 7.0.1

### Patch Changes

- @studnicky/clock@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/clock@7.0.0
  - @studnicky/json@7.0.0
