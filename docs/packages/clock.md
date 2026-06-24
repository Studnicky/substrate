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

Build a `Clock` instance with a provider, then call `now()` for epoch-ms and `hrtime()` for nanosecond bigint. Both reads are monotonically clamped per instance:

<<< ../../packages/clock/examples/basic-usage.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/clock` | `Clock`, `RealTimeClockProvider`, `VirtualClockProvider`, `VirtualTimeCounter` |
| `@studnicky/clock/interfaces` | `ClockProviderType` |

## Virtual time control

`VirtualTimeCounter` and `VirtualClockProvider` give deterministic time control — no sleeping, no wall-clock dependency. Multiple independent or shared counters can drive separate clocks:

<<< ../../packages/clock/examples/virtual-time.ts#usage

## Custom providers

Implement `ClockProviderType` (two methods: `now(): number` and `hrtime(): bigint`) to inject any time source into `Clock`. Swapping the provider changes what `Clock` returns without touching consumers:

<<< ../../packages/clock/examples/custom-provider.ts#usage

## Extending

`Clock` exposes two protected read hooks — subclasses may override them to intercept or replace values before monotonicity clamping:

<!-- inline-ts-ok: conceptual subclass pattern; no standalone runnable example exists for Clock subclassing -->
```typescript
import { Clock } from '@studnicky/clock';
import type { ClockProviderType } from '@studnicky/clock/interfaces';

class TrackedClock extends Clock {
  constructor(provider: ClockProviderType) {
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
