---
title: '@studnicky/timing'
description: High-resolution operation timing tracker using process.hrtime.bigint().
---

# @studnicky/timing

> High-resolution timing tracker for collecting operation metrics.

## Install

```bash
pnpm add @studnicky/timing
```

## Usage

```typescript
import { Timing, TimingEvent, TIMING_STATUS } from '@studnicky/timing';

const timing = Timing.builder()
  .maxEvents(100)
  .build();

// Record a point event
timing.event(
  TimingEvent.create()
    .component('GraphAdapter')
    .operation('query')
    .build()
);

// Record a start/end pair
timing.event(
  TimingEvent.create()
    .component('DatabaseAdapter')
    .operation('connect')
    .status(TIMING_STATUS.START)
    .build()
);
// ... do work ...
timing.event(
  TimingEvent.create()
    .component('DatabaseAdapter')
    .operation('connect')
    .status(TIMING_STATUS.END)
    .build()
);

// Emit as logging context
const ctx = timing.getEvents();
// { 'GraphAdapter.query': 12.34, 'DatabaseAdapter.connect.start': 15.67, ... }
```

### No-op for production disabling

```typescript
import { NoOpTiming } from '@studnicky/timing';

const timing = new NoOpTiming(); // all calls are no-ops
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/timing` | `Timing`, `TimingEvent`, `NoOpTiming`, `TIMING_STATUS`, `ConfigurationError`, `TimingBuildError` |
| `@studnicky/timing/builders` | Builder classes |
| `@studnicky/timing/constants` | `TIMING_STATUS` |
| `@studnicky/timing/errors` | Error classes |
| `@studnicky/timing/interfaces` | Interface types |
| `@studnicky/timing/types` | Type aliases |

## Extending

`Timing` exposes protected hooks for event recording:

```typescript
import { Timing } from '@studnicky/timing';

class CloudTiming extends Timing {
  protected override onEvent(component: string, operation: string, elapsedMs: number): void {
    cloudwatch.putMetricData({
      MetricName: `${component}.${operation}`,
      Value: elapsedMs
    });
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/timing)
