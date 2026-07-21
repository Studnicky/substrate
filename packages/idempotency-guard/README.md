# @studnicky/idempotency-guard

> Idempotency key guard composing `@studnicky/cache`, `@studnicky/concurrency`, and `@studnicky/json`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/idempotency-guard)

Given a caller-supplied idempotency key and request payload, `IdempotencyGuard` replays the cached result for a repeat call within a TTL window, single-flights concurrent duplicate calls, and rejects a key reused with a *different* payload. It composes three existing primitives into the "check cache → check in-flight → run → store" sequence: an `LruCache` for TTL-bounded result storage, a `Coalesce` for in-flight dedup, and `Hash` for structural payload fingerprinting — no new storage engine.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/idempotency-guard
```

## Usage

```typescript
import { IdempotencyGuard } from '@studnicky/idempotency-guard';

const guard = IdempotencyGuard.create<Awaited<ReturnType<typeof chargeCard>>>({
  capacity: 1000,
  ttlMs: 60_000
});

const result = await guard.run('order-123', { amount: 500 }, async () => {
  return chargeCard(500);
});

// Same key, same payload, within ttlMs -> replays the cached result, factory does NOT run
const replayed = await guard.run('order-123', { amount: 500 }, async () => {
  return chargeCard(500);
});

// Same key, DIFFERENT payload -> throws IdempotencyConflictError, factory does NOT run
await guard.run('order-123', { amount: 999 }, async () => {
  return chargeCard(999);
});
```

Concurrent calls with the same key and payload, issued before the first resolves, share one execution — the factory runs exactly once via the composed `Coalesce`.

## API

### `IdempotencyGuard.create<TResult>(options): IdempotencyGuard<TResult>`

| Option | Type | Description |
|--------|------|-------------|
| `capacity` | `number` | Maximum number of distinct idempotency keys retained at once (composed `LruCache` capacity) |
| `ttlMs` | `number` | Time-to-live (ms) for a cached key/result/fingerprint entry |

### `run(key, payload, factory): Promise<TResult>`

`TResult` belongs to the `IdempotencyGuard<TResult>` instance and is shared by every key the guard owns. `run()` fingerprints `payload` via `Hash.value()` and checks the composed cache for an entry under `key`:

`IdempotencyGuardEntryMetadataEntity` owns the schema-derived fingerprint field composed by `IdempotencyGuardEntryInterface<TResult>`; the interface retains the caller-owned generic result.

- Entry present, fingerprint matches → the cached result is replayed without re-running `factory`.
- Entry present, fingerprint differs → throws `IdempotencyConflictError` without running `factory`.
- No entry (key unseen, or seen but expired) → runs through the composed `Coalesce` so concurrent callers sharing the key share one execution, then caches the result alongside its fingerprint.

## Hooks

| Hook | Fires when |
|------|------------|
| `onReplay(key)` | A repeat call for `key` finds a matching-fingerprint cached entry and replays it |
| `onCoalesce(key)` | A caller joins an already in-flight execution for `key` |
| `onConflict(key)` | Fires immediately before throwing `IdempotencyConflictError` for a fingerprint mismatch |
| `onExecute(key)` | `key` is genuinely new (or its entry expired) and `factory` is about to run |

`IdempotencyGuard` exposes hooks at the idempotency boundary: replay, conflict, execution, and coalescing. Cache eviction and internal coalescer lifecycle remain implementation details; consumers observe the semantic outcome instead of mutating the guard's internal coordination state.

## Extending

Subclass `IdempotencyGuard` and override any of the protected lifecycle hooks to add telemetry without coupling the base class to a metrics library.

```typescript
import { IdempotencyGuard } from '@studnicky/idempotency-guard';

class TelemetryIdempotencyGuard extends IdempotencyGuard<Awaited<ReturnType<typeof chargeCard>>> {
  readonly events: string[] = [];

  static tracked(): TelemetryIdempotencyGuard {
    return new TelemetryIdempotencyGuard({ capacity: 1000, ttlMs: 60_000 });
  }

  protected override onReplay(key: string): void {
    this.events.push(`replay:${key}`);
  }

  protected override onConflict(key: string): void {
    this.events.push(`conflict:${key}`);
  }
}

const guard = TelemetryIdempotencyGuard.tracked();
```

See `examples/observedIdempotencyGuard.ts` for the full runnable version.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/idempotency-guard

## License

MIT
