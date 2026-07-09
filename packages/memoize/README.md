# @studnicky/memoize

> Pure function memoization composing `@studnicky/cache` and `@studnicky/concurrency`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/memoize)

Wraps an arbitrary function and caches its result keyed by a caller-supplied key derivation over its arguments, with LRU+TTL eviction and in-flight call dedup. It composes two existing primitives into the "check cache → check in-flight → run → store" sequence: an `LruCache` for TTL-bounded result storage and a `Coalesce` for in-flight dedup — no new storage engine, no implicit argument hashing.

**`@studnicky/memoize` vs. `@studnicky/idempotency-guard`:** both compose `LruCache` + `Coalesce`, but solve different problems. `Memoize` is pure memoization — the same derived key always replays the cached result, no conflict detection. `IdempotencyGuard` fingerprints a payload alongside the cached result and *errors* when a key is reused for a different payload — pick `IdempotencyGuard` when key reuse with a different payload is a bug you want to catch, pick `Memoize` when you just want to cache a function's result.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/memoize
```

## Usage

```typescript
import { Memoize } from '@studnicky/memoize';

const memo = Memoize.create(
  (userId: string) => fetchUser(userId),
  { keyFn: (userId) => userId, capacity: 1000, ttlMs: 60_000 }
);

const user = await memo.call('user-42');

// Same key, within ttlMs -> returns the cached result, fn does NOT run
const cached = await memo.call('user-42');

// Force the next call for this key to re-invoke fn
memo.invalidate('user-42');

// Evict every cached entry
memo.clear();
```

Concurrent calls with the same derived key, issued before the first resolves, share one invocation — the wrapped function runs exactly once via the composed `Coalesce`.

`keyFn` is a required config field — it mirrors `LruCache`'s explicit-key model rather than an implicit tuple hash, which is unsound for object/function arguments.

## API

### `Memoize.create(fn, options): Memoize`

| Option | Type | Description |
|--------|------|-------------|
| `keyFn` | `(...args) => string` | Derives the cache/coalesce key from a call's arguments (required) |
| `capacity` | `number` | Maximum number of distinct derived keys retained at once (composed `LruCache` capacity) |
| `ttlMs` | `number?` | Time-to-live (ms) for a cached result |
| `staleMs` | `number?` | Staleness threshold (ms) for a cached result |

### `Memoize.builder(): MemoizeBuilder`

Fluent alternative: `.withFn(fn).withKeyFn(keyFn).withCapacity(n).withTtlMs(ms).build()`.

### `call(...args): Promise<TResult>`

Derives `key = keyFn(...args)` and checks the composed cache:

- Entry present → the cached result is returned without re-invoking `fn`.
- No entry → runs through the composed `Coalesce` so concurrent callers sharing the key share one invocation, then caches the result.

### `invalidate(...args): void`

Evicts the cache entry for `keyFn(...args)` so the next matching call re-invokes `fn`.

### `clear(): void`

Evicts every cached entry.

### Getters (Layer Transparency)

| Getter | Returns |
|--------|---------|
| `getCache()` | The composed `LruCache<string, TResult>` instance |
| `getCoalesce()` | The composed `Coalesce<TResult>` instance |

Every getter returns the exact instance used internally — never a copy or wrapper — so an advanced consumer can subclass `LruCache`/`Coalesce` directly and reach it through the getter without subclassing `Memoize`.

## Hooks

| Hook | Fires when |
|------|------------|
| `onMemoHit(key, args)` | `call()` returns a cached result for `key` without re-invoking `fn` |
| `onMemoMiss(key, args)` | `key` is genuinely new (or its entry expired) and `fn` is about to run |
| `onMemoCoalesced(key, args)` | A caller joins an already in-flight invocation for `key` |

`Memoize` introduces no hooks duplicating what `LruCache`/`Coalesce` already expose — its own hooks are specifically about memoization semantics (hit/miss/coalesced). Generic cache/coalesce lifecycle (`onEvict`, `onExpire`, `onCoalesceSettled`, `onTimeout`, ...) stays reachable via `getCache()`/`getCoalesce()` for a consumer who subclasses the composed instances directly.

## Extending

Subclass `Memoize` and override any of the protected lifecycle hooks to add telemetry without coupling the base class to a metrics library.

```typescript
import { Memoize } from '@studnicky/memoize';

class TelemetryMemoize extends Memoize<[string], User> {
  readonly events: string[] = [];

  static tracked(fn: (userId: string) => Promise<User>): TelemetryMemoize {
    return TelemetryMemoize.create(fn, { keyFn: (userId) => userId, capacity: 1000, ttlMs: 60_000 }) as TelemetryMemoize;
  }

  protected override onMemoHit(key: string): void {
    this.events.push(`hit:${key}`);
  }

  protected override onMemoMiss(key: string): void {
    this.events.push(`miss:${key}`);
  }
}

const memo = TelemetryMemoize.tracked(fetchUser);
```

See `examples/observedMemoize.ts` for the full runnable version.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/memoize

## License

MIT
