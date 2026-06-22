# @studnicky/clock

> Wall-clock and monotonic time primitives with injectable providers for deterministic testing

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/clock)

`@studnicky/clock` provides a `Clock` class that delegates to a swappable `ClockProviderInterface`, returning epoch-ms from `.now()` and nanosecond timestamps from `.hrtime()` — both with per-instance monotonicity enforcement. Swap in `VirtualClockProvider` and `VirtualTimeCounter` for fully deterministic time control in tests.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/clock
```

## Usage

### Production — real wall-clock time

```ts
import { Clock, RealTimeClockProvider } from '@studnicky/clock';

const provider = new RealTimeClockProvider();
const clock = new Clock(provider);

const epochMs = clock.now();     // e.g. 1750000000000
const ns = clock.hrtime();       // e.g. 1234567890123456789n
```

Pass an optional `offsetMs` to `RealTimeClockProvider` for clock-skew correction:

```ts
// Shift all readings forward by 500 ms
const skewed = new RealTimeClockProvider(500);
const clock = new Clock(skewed);
```

### Testing — deterministic virtual time

```ts
import { Clock, VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';

const counter = new VirtualTimeCounter(0);         // start at epoch-ms 0
const provider = new VirtualClockProvider(counter);
const clock = new Clock(provider);

console.log(clock.now());    // 0
counter.advance(1000);
console.log(clock.now());    // 1000
counter.advance(500);
console.log(clock.now());    // 1500
```

Multiple `Clock` instances can share one counter — all see advances immediately:

```ts
const counter = new VirtualTimeCounter(0);
const clockA = new Clock(new VirtualClockProvider(counter));
const clockB = new Clock(new VirtualClockProvider(counter));

counter.advance(200);
console.log(clockA.now()); // 200
console.log(clockB.now()); // 200
```

## Extending

`ClockProviderInterface` is the DI seam — implement it to inject any time source:

```ts
import type { ClockProviderInterface } from '@studnicky/clock';
import { Clock } from '@studnicky/clock';

class FixedClockProvider implements ClockProviderInterface {
  hrtime(): bigint { return 42_000_000n; }
  now(): number    { return 42; }
}

const clock = new Clock(new FixedClockProvider());
console.log(clock.now());    // 42
console.log(clock.hrtime()); // 42000000n
```

`Clock` also exposes protected override seams — `readNow()` and `readHrtime()` — for subclasses that need to intercept or transform values before monotonicity clamping is applied.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/clock

## License

MIT
