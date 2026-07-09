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

| Getter | Returns |
|--------|---------|
| `getThrottle()` | The composed `Throttle` instance |
| `getCircuitBreaker()` | The composed `CircuitBreaker` instance |
| `getRetry()` | The composed `Retry` instance |

Every getter returns the exact instance passed to `create()`/`builder()` — never a copy or wrapper — so a caller who subclassed `Throttle`/`CircuitBreaker`/`Retry` for their own hooks (`onAcquire`, `onOpen`, `onGiveUp`, and so on) keeps full access to those subclasses' own hooks.

## Composition order

`throttle.execute(() => circuitBreaker.execute(() => retry.execute(fn)))`. See "Usage" above for why this order, and not another, is the correct default.

## Aborted throttle calls

`Throttle#execute()` resolves `undefined` (rather than rejecting) when the throttle discards a call via its detach-and-abandon abort behavior. `BoundaryKit#execute()` cannot return `undefined` as `T`, so it surfaces that discard as a rejected `BoundaryKitAbortedError` instead.

## Extending

Subclass `BoundaryKit` to add convenience behavior that reaches the composed instances through the getters — `BoundaryKit` has no lifecycle hooks of its own to override. Subclass the composed primitives themselves (`Throttle`, `CircuitBreaker`, `Retry`) to observe or transform the acquire/trip/attempt stages; those hooks fire exactly as they would standalone.

See `examples/observedBoundaryKit.ts` for the full runnable version, including default construction and pre-built subclassed primitives.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/boundary-kit

## License

MIT
