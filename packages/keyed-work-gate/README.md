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
const acceptsUndefined = (value: unknown): value is undefined => value === undefined;
const acceptsUser = (value: unknown): value is User => value instanceof User;

// Concurrent callers with the same key share one execution
const [a, b] = await Promise.all([
  gate.runSingleFlight('user1', () => fetchUser('user1'), acceptsUser),
  gate.runSingleFlight('user1', () => fetchUser('user1'), acceptsUser)
]);

// Every call runs, serialized, none skipped or shared
await gate.runSerialized('user1', async () => {
  await writeUser('user1', patch);
}, acceptsUndefined);
```

Both routes require a runtime result predicate. `runSerialized` passes it directly to `Mutex`; `runSingleFlight` routes its elected leader through that same method and then applies each joined caller's predicate to the shared result.

Each composed primitive accepts either a pre-built instance (subclassed or not) or the config shape passed straight to that primitive's own `create()`.

## Composition order: why Coalesce falls through to Mutex

`runSingleFlight` routes through `Coalesce` first, and its elected factory calls the canonical `runSerialized` route to acquire the `Mutex` before running `fn`. This order is not interchangeable with mutex-first:

1. **Coalesce first** collapses concurrent callers requesting the identical key into a single execution — every caller in the group observes the same result, and `fn` runs exactly once for the whole group.
2. **Mutex fall-through** still guards that one execution against unrelated exclusive work on the same key from a different call path — specifically, a concurrent `runSerialized` call against the same key. Coalescing only dedupes callers *within* `runSingleFlight`; it does nothing to protect the key against other call paths, so the mutex is what keeps the coalesced leader mutually exclusive against that other work.

Reversing the order (mutex-first, then coalesce) would defeat single-flight collapsing: every caller would separately queue for the lock before coalescing ever got a chance to join them, so coalescing would only ever see one queued caller at a time and would never actually collapse concurrent duplicates.

## Composition and observability

`KeyedWorkGate` introduces no hook of its own — every observable stage is already covered by the composed primitive it delegates to:

Callers who supply subclassed `Mutex` or `Coalesce` instances retain those instances and inspect their own hook state directly. The gate keeps its owned delegates private.

## Extending

Subclass the composed primitives (`Mutex`, `Coalesce`) to observe lock/coalesce stages; those hooks fire exactly as they would standalone. Retain each supplied instance when constructing the gate.

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
    const gate = this.create<string>({ mutex });

    if (!(gate instanceof ReportingKeyedWorkGate)) {
      throw new Error('KeyedWorkGate subclass factory returned the wrong instance type');
    }

    return gate;
  }

}

const mutex = new TelemetryMutex();
const gate = ReportingKeyedWorkGate.tracked(mutex);
console.log(mutex.acquisitions.length);
```

See `examples/observedKeyedWorkGate.ts` for the full runnable version, including a subclassed `Coalesce`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/keyed-work-gate

## License

MIT
