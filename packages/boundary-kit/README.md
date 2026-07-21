# @studnicky/boundary-kit

> Composes `@studnicky/throttle`, `@studnicky/resilience`'s `CircuitBreaker`, and `@studnicky/retry` into a fixed-order boundary call pattern

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/boundary-kit)

Composes three substrate primitives into the fixed composition order `throttle → circuitBreaker → retry → fn`. That order is the kit's entire value: throttle bounds concurrency first so the circuit breaker and retry never observe more concurrent load than the throttle admits; the circuit breaker wraps retry so a tripped circuit fails fast BEFORE any retry attempt is wasted against a known-broken dependency; retry runs innermost, directly against the real call. Getting this order backwards is easy to do by hand and changes behavior silently — that is exactly the kind of wiring `BoundaryKit` exists to protect a consumer from re-deriving.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/boundary-kit
```

## Usage

```typescript
import { BoundaryKit } from '@studnicky/boundary-kit';

const kit = BoundaryKit.create({
  throttle: { concurrencyLimit: 10 },
  circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30_000 },
  retry: { maxRetries: 3 }
});

const response = await kit.execute(() => fetch('https://api.example.com/users'));
```

Each composed primitive accepts either a pre-built instance (subclassed or not) or the config shape passed straight to that primitive's own `create()`. `circuitBreaker` has no zero-arg default of its own — `failureThreshold` and `resetTimeoutMs` are required by `CircuitBreakerOptionsInterface` — so an omitted `circuitBreaker` key resolves against `BoundaryKit`'s own default (`{ failureThreshold: 5, resetTimeoutMs: 30_000 }`), not the bare primitive's.

## Transparency

`BoundaryKit` introduces no hook of its own — every observable stage is already covered by the composed primitive it delegates to:

Pass pre-built `Throttle`, `CircuitBreaker`, or `Retry` instances to `create()` and retain those original references for direct hook and state observation. `BoundaryKit` does not clone or wrap supplied instances.

## Composition order

`throttle.execute(() => circuitBreaker.execute(() => retry.execute(fn)))`. See "Usage" above for why this order, and not another, is the correct default.

## Aborted throttle calls

`BoundaryKit#execute()` tracks whether the inner operation completes separately from its resolved value. An operation that legitimately resolves `undefined` or returns `void` completes normally with that value. `BoundaryKitAbortedError` is reserved for a throttle discard caused by detach-and-abandon abort behavior, where the inner operation never runs.

## Extending

Subclass the composed primitives (`Throttle`, `CircuitBreaker`, `Retry`) to observe or transform the acquire/trip/attempt stages, then pass those instances to `BoundaryKit.create()`. Their hooks fire exactly as they do standalone.

See `examples/observedBoundaryKit.ts` for the full runnable version, including default construction and pre-built subclassed primitives.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/boundary-kit

## License

MIT
