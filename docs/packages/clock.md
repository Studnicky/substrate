---
title: '@studnicky/clock'
description: Wall-clock and monotonic time with injectable providers for deterministic testing.
---

# @studnicky/clock

> Wall-clock and monotonic time primitives with injectable providers for deterministic testing.

## Install

```bash
pnpm add @studnicky/clock
```

## Usage

```typescript
import { Clock, RealTimeClockProvider, VirtualClockProvider } from '@studnicky/clock';

// Production: real wall-clock time
const clock = new Clock(new RealTimeClockProvider());

console.log(clock.now());    // ms since epoch (monotonic-clamped)
console.log(clock.hrtime()); // nanosecond bigint (monotonic-clamped)
```

### Deterministic testing

```typescript
import { Clock, VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';

const counter = new VirtualTimeCounter(Date.now());
const provider = new VirtualClockProvider(counter);
const clock = new Clock(provider);

// Advance time without sleeping
counter.advance(5000); // jump forward 5 seconds
console.log(clock.now()); // reflects the advanced time
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/clock` | `Clock`, `RealTimeClockProvider`, `VirtualClockProvider`, `VirtualTimeCounter` |
| `@studnicky/clock/interfaces` | `ClockProviderInterface` |

## Extending

`Clock` exposes two protected read hooks:

```typescript
import { Clock } from '@studnicky/clock';
import type { ClockProviderInterface } from '@studnicky/clock';

class TrackedClock extends Clock {
  constructor(provider: ClockProviderInterface) {
    super(provider);
  }

  protected override readHrtime(): bigint {
    const t = super.readHrtime();
    metrics.gauge('clock.hrtime', Number(t));
    return t;
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/clock)
