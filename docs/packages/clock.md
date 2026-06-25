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

`VirtualTimeCounter` and `VirtualClockProvider` give deterministic time control with no sleeping and no wall-clock dependency. Multiple independent or shared counters can drive separate clocks:

<<< ../../packages/clock/examples/virtual-time.ts#usage

## Custom providers

Implement `ClockProviderType` (two methods: `now(): number` and `hrtime(): bigint`) to inject any time source into `Clock`. Swapping the provider changes what `Clock` returns without touching consumers:

<<< ../../packages/clock/examples/custom-provider.ts#usage

## Observability hooks

Every stateful operation across `Clock`, `RealTimeClockProvider`, `VirtualClockProvider`, and `VirtualTimeCounter` exposes a protected lifecycle hook. Subclass any of these classes and override the relevant hook to add logging, metrics, or tracing without touching public API behavior.

| Hook | Class | When it fires | Args |
|------|-------|---------------|------|
| `onNow(timestamp)` | `Clock` | After each `now()` call, with the monotonically-clamped epoch-ms returned to the caller | `timestamp: number` |
| `onHrtime(value)` | `Clock` | After each `hrtime()` call, with the monotonically-clamped nanosecond bigint returned to the caller | `value: bigint` |
| `onNow(timestamp)` | `RealTimeClockProvider` | After each `now()` call, with the final epoch-ms (raw + offset) returned to the caller | `timestamp: number` |
| `onHrtime(value)` | `RealTimeClockProvider` | After each `hrtime()` call, with the final nanosecond bigint (performance.now() + offset) returned to the caller | `value: bigint` |
| `onNow(timestamp)` | `VirtualClockProvider` | After each `now()` call, with the virtual epoch-ms (clamped to 0 if negative) returned to the caller | `timestamp: number` |
| `onHrtime(value)` | `VirtualClockProvider` | After each `hrtime()` call, with the virtual nanosecond bigint returned to the caller | `value: bigint` |
| `onAdvance(deltaMs, nowMs)` | `VirtualTimeCounter` | After each positive `advance()` call, with the applied delta and the resulting epoch-ms | `deltaMs: number, nowMs: number` |
| `onNowMs(value)` | `VirtualTimeCounter` | After each `nowMs()` call, with the current virtual epoch-ms returned to the caller | `value: number` |

<<< ../../packages/clock/examples/observedClock.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Extending

`Clock` exposes two protected read hooks that subclasses may override to intercept or replace values before monotonicity clamping:

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
