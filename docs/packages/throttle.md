---
title: '@studnicky/throttle'
description: Sliding-window concurrency throttle with adaptive limits and abort support.
---

# @studnicky/throttle

> Generic async operation throttle with sliding window concurrency control.

## Install

```bash
pnpm add @studnicky/throttle
```

## Usage

Build a `Throttle` instance with the constructor or factory, then pass any operation to `execute`. The instance tracks stats and enforces the concurrency limit:

<<< ../../packages/throttle/examples/basicThrottle.ts#usage

## Drain

Call `drain()` to stop accepting new work and wait for all active and queued operations to finish gracefully:

<<< ../../packages/throttle/examples/drainThrottle.ts#usage

### Abort support

<!-- inline-ts-ok: no abort example file exists; pattern is self-contained and distinct from drain -->
```typescript
const throttle = Throttle.create({ concurrencyLimit: 3 });

// Queued operations resolve with undefined, active ones continue silently
await throttle.abort();
```

### Builder

<!-- inline-ts-ok: no builder example file exists; ThrottleBuilder usage is a brief API surface demo -->
```typescript
import { ThrottleBuilder } from '@studnicky/throttle';

const throttle = new ThrottleBuilder()
  .concurrencyLimit(8)
  .build();
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/throttle` | `Throttle`, `ThrottleBuilder`, errors, interfaces, type guards |
| `@studnicky/throttle/constants` | Default configuration constants |
| `@studnicky/throttle/errors` | `ConfigurationError`, `ThrottleAbortedError`, `ThrottleDrainingError` |
| `@studnicky/throttle/interfaces` | Interface types |
| `@studnicky/throttle/types` | `AdaptiveConfigInputType` |

## Extending

Subclass `Throttle` and override `onAcquire` and `onRelease` to collect telemetry without coupling the throttle core to any metrics library:

<<< ../../packages/throttle/examples/observedThrottle.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/throttle)
