# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `IdempotencyGuard` class composing `@studnicky/cache` (`LruCache`), `@studnicky/concurrency` (`Coalesce`), and `@studnicky/json` (`Hash`) into the "check cache → check in-flight → run → store" idempotency-key pattern.
- `run<TResult>(key, payload, factory)` public API: replays a cached result within the configured TTL window for a matching payload fingerprint, single-flights concurrent identical calls via the composed `Coalesce`, and throws `IdempotencyConflictError` when a key is reused with a different payload.
- Protected lifecycle hooks (`onReplay`, `onCoalesce`, `onConflict`, `onExecute`) — `onExecute`/`onCoalesce` delegated from the internal `Coalesce` instance's `onCoalesceStart`/`onCoalesceJoin`, following the delegation technique `@studnicky/paginator`'s `Paginator` uses for its internal `StateMachine`.
- `getCache()`/`getCoalesce()` getters exposing the exact composed instances (Layer Transparency Rule).
- `IdempotencyGuardConfigError` and `IdempotencyConflictError`, extending the package-local `IdempotencyGuardError` base.
