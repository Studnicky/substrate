# @studnicky/keyed-work-gate

> Keyed single-flight and serialized work gate composing `@studnicky/mutex` and `@studnicky/concurrency`'s `Coalesce`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/keyed-work-gate)

Composes two substrate primitives into two keyed work-gating patterns: `runSingleFlight` collapses concurrent same-key callers into one execution via `Coalesce`, whose single execution still acquires the `Mutex` for that key; `runSerialized` bypasses coalescing entirely and routes directly through the `Mutex`, so every call actually runs. `KeyedWorkGate` performs neither HTTP calls nor any work itself — the caller's `fn` is the unit of work being gated.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/keyed-work-gate
```

## Usage

```typescript
import { KeyedWorkGate } from '@studnicky/keyed-work-gate';

const gate = KeyedWorkGate.create<string>();

// Concurrent callers with the same key share one execution
const [a, b] = await Promise.all([
  gate.runSingleFlight('user1', () => fetchUser('user1')),
  gate.runSingleFlight('user1', () => fetchUser('user1'))
]);

// Every call runs, serialized, none skipped or shared
await gate.runSerialized('user1', () => writeUser('user1', patch));
```

Each composed primitive accepts either a pre-built instance (subclassed or not) or the config shape passed straight to that primitive's own `create()`.

## Composition order: why Coalesce falls through to Mutex

`runSingleFlight` routes through `Coalesce` first, and the `Coalesce` factory itself acquires the `Mutex` before running `fn`. This order is not interchangeable with mutex-first:

1. **Coalesce first** collapses concurrent callers requesting the identical key into a single execution — every caller in the group observes the same result, and `fn` runs exactly once for the whole group.
2. **Mutex fall-through** still guards that one execution against unrelated exclusive work on the same key from a different call path — specifically, a concurrent `runSerialized` call against the same key. Coalescing only dedupes callers *within* `runSingleFlight`; it does nothing to protect the key against other call paths, so the mutex is what keeps the coalesced leader mutually exclusive against that other work.

Reversing the order (mutex-first, then coalesce) would defeat single-flight collapsing: every caller would separately queue for the lock before coalescing ever got a chance to join them, so coalescing would only ever see one queued caller at a time and would never actually collapse concurrent duplicates.

## Transparency

`KeyedWorkGate` introduces no hook of its own — every observable stage is already covered by the composed primitive it delegates to:

| Getter | Returns |
|--------|---------|
| `getMutex()` | The composed `Mutex` instance |
| `getCoalesce()` | The composed `Coalesce` instance |

Every getter returns the exact instance passed to `create()`/`builder()` — never a copy or wrapper — so a caller who subclassed `Mutex` for lock-lifecycle observability or `Coalesce` for join/leader tracking keeps full access to those subclasses' own hooks.

## Extending

Subclass `KeyedWorkGate` to add convenience behavior that reaches the composed instances through the getters — `KeyedWorkGate` has no lifecycle hooks of its own to override. Subclass the composed primitives themselves (`Mutex`, `Coalesce`) to observe lock/coalesce stages; those hooks fire exactly as they would standalone.

```typescript
import { Mutex } from '@studnicky/mutex';
import { KeyedWorkGate } from '@studnicky/keyed-work-gate';

class TelemetryMutex extends Mutex<string> {
  readonly acquisitions: string[] = [];

  protected override afterAcquire(key: string): void {
    this.acquisitions.push(key);
  }
}

class ReportingKeyedWorkGate extends KeyedWorkGate<string> {
  static tracked(mutex: TelemetryMutex): ReportingKeyedWorkGate {
    return KeyedWorkGate.create({ mutex }) as ReportingKeyedWorkGate;
  }

  report(): { acquisitions: number } {
    return { acquisitions: (this.getMutex() as TelemetryMutex).acquisitions.length };
  }
}

const mutex = new TelemetryMutex();
const gate = ReportingKeyedWorkGate.tracked(mutex);
```

See `examples/observedKeyedWorkGate.ts` for the full runnable version, including a subclassed `Coalesce`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/keyed-work-gate

## License

MIT
