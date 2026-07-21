# @studnicky/timing

> High-resolution timing tracker for collecting operation metrics

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/timing)

Collects `process.hrtime.bigint()` timestamps for named `component.operation[.status]` events and returns them as a flat record of elapsed milliseconds. Designed for low-overhead instrumentation of async pipelines, adapters, and services.

`@studnicky/timing` is the sole public code entrypoint.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/timing
```

## Usage

### Basic timing

```typescript
import { Timing, TimingEvent, TIMING_STATUS } from '@studnicky/timing';

const timing = Timing.create({ 'maxEvents': 100 });

// Record a plain component.operation event
timing.event(TimingEvent.create({ 'component': 'GraphAdapter', 'operation': 'query' }));

// Record a component.operation.status event
timing.event(
  TimingEvent.create({ 'component': 'GraphAdapter', 'operation': 'query', 'status': TIMING_STATUS.START })
);
timing.event(
  TimingEvent.create({ 'component': 'GraphAdapter', 'operation': 'query', 'status': TIMING_STATUS.COMPLETE })
);

const events = timing.getEvents();
// {
//   initialize: 0,
//   'GraphAdapter.query': <ms>,
//   'GraphAdapter.query.start': <ms>,
//   'GraphAdapter.query.complete': <ms>,
//   durationMs: <ms>
// }
console.log(events);
```

### No-op timing

Use `NoOpTiming` when timing collection should be silenced — in test helpers or disabled production paths:

```typescript
import { NoOpTiming } from '@studnicky/timing';

const timing = NoOpTiming.create();
timing.event(TimingEvent.create({ 'component': 'Cache', 'operation': 'get' }));

console.log(timing.getEvents()); // { durationMs: 0 }
```

### Precision control

```typescript
const timing = Timing.create({
  maxEvents: 50,
  precision: { ms: 2 } // round to 2 decimal places
});
```

## Extending

Override the protected `onEvent` hook to instrument or export timing data without changing the public API:

```typescript
import type { TimingEventDataEntity } from '@studnicky/timing';

import { Timing } from '@studnicky/timing';

class InstrumentedTiming extends Timing {
  readonly fired: string[] = [];

  protected override onEvent(data: TimingEventDataEntity.Type, _timestamp: bigint): void {
    this.fired.push(data.event);
  }

  static of(): InstrumentedTiming {
    return new InstrumentedTiming({});
  }
}
```

For deterministic testing, override the protected `readHrtime()` method to return a controlled `bigint` nanosecond counter instead of `process.hrtime.bigint()`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/timing

## License

MIT
