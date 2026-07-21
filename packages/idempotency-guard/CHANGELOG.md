# Changelog

## 7.0.1

### Patch Changes

- @studnicky/cache@7.0.1
- @studnicky/concurrency@7.0.1
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
  - @studnicky/concurrency@7.0.0
  - @studnicky/cache@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `IdempotencyGuard` class composing `@studnicky/cache` (`LruCache`), `@studnicky/concurrency` (`Coalesce`), and `@studnicky/json` (`Hash`) into the "check cache → check in-flight → run → store" idempotency-key pattern.
- `IdempotencyGuard<TResult>#run(key, payload, factory)` public API: the guard instance owns the result contract shared by every key, replays a cached result within the configured TTL window for a matching payload fingerprint, single-flights concurrent identical calls via the composed `Coalesce`, and throws `IdempotencyConflictError` when a key is reused with a different payload.
- `IdempotencyGuardEntryInterface<TResult>` describes each runtime cache and coalescing entry, composing its fingerprint from `IdempotencyGuardEntryMetadataEntity` while retaining the generic result.
- Protected lifecycle hooks (`onReplay`, `onCoalesce`, `onConflict`, `onExecute`) — `onExecute`/`onCoalesce` delegated from the internal `Coalesce` instance's `onCoalesceStart`/`onCoalesceJoin`, following the delegation technique `@studnicky/paginator`'s `Paginator` uses for its internal `StateMachine`.
- `IdempotencyConflictError`, extending the package-local `IdempotencyGuardError` base.
