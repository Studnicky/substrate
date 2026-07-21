---
"@studnicky/idempotency-guard": major
---

`IdempotencyGuard` class composing `@studnicky/cache` (`LruCache`), `@studnicky/concurrency` (`Coalesce`), and `@studnicky/json` (`Hash`) into the "check cache → check in-flight → run → store" idempotency-key pattern.

`IdempotencyGuard<TResult>#run(key, payload, factory)` public API: the guard instance owns the result contract shared by every key, replays a cached result within the configured TTL window for a matching payload fingerprint, single-flights concurrent identical calls via the composed `Coalesce`, and throws `IdempotencyConflictError` when a key is reused with a different payload.

`IdempotencyGuardEntryInterface<TResult>` describes each runtime cache and coalescing entry, composing its fingerprint from `IdempotencyGuardEntryMetadataEntity` while retaining the generic result.

Protected lifecycle hooks (`onReplay`, `onCoalesce`, `onConflict`, `onExecute`) — `onExecute`/`onCoalesce` delegated from the internal `Coalesce` instance's `onCoalesceStart`/`onCoalesceJoin`, following the delegation technique `@studnicky/paginator`'s `Paginator` uses for its internal `StateMachine`.

`IdempotencyConflictError`, extending the package-local `IdempotencyGuardError` base.
