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

## Try it

### Builder

`Throttle.builder().withConcurrencyLimit(3).build()` constructs the throttle through the fluent builder. Press Execute to submit 6 operations through the concurrencyLimit-3 throttle; all 6 complete in order, and stats confirm 6 total executed with the configured limit.

<RunnableExample src="packages/throttle/examples/builder-throttle" title="Builder — fluent throttle construction" />

### Lifecycle hooks

`TracingThrottle` subclasses `Throttle` and overrides eight hooks: `onAcquire`, `onContended`, `onAcquireWait`, `onWindowSlide`, `onRelease`, `onDrainStart`, `onDrainComplete`, and the FSM transition hook `onEnter`. With concurrencyLimit=2 and 4 ops submitted, watch the first two acquire immediately, the second two contend and queue, then window-slide events as slots free up. A `drain()` call then drains the throttle gracefully.

<RunnableExample src="packages/throttle/examples/observedThrottle" title="Observed throttle — lifecycle hook trace" />

### Abort support

<!-- inline-ts-ok: no abort example file exists; pattern is self-contained and distinct from drain -->
```typescript
const throttle = Throttle.create({ concurrencyLimit: 3 });

// Queued operations resolve with undefined, active ones continue silently
await throttle.abort();
```

### Builder

<!-- inline-ts-ok: brief API surface demo -->
```typescript
import { Throttle } from '@studnicky/throttle';

const throttle = Throttle.builder()
  .withConcurrencyLimit(8)
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

## Observability hooks

Subclass `Throttle` and override any of the protected hooks below to add logging, metrics, or tracing without coupling the throttle core to any observability library.

| Hook | When it fires | Args |
|------|--------------|------|
| `onEnter(to, from)` | Every FSM state transition | `to: ThrottleStateType`, `from: ThrottleStateType` |
| `onAcquire(activeCount, queuedCount)` | A slot is granted immediately (window not full) | `activeCount: number`, `queuedCount: number` |
| `onContended(activeCount, queuedCount)` | A caller arrives at a saturated window and is about to queue | `activeCount: number`, `queuedCount: number` |
| `onAcquireWait(queuedCount)` | A caller has been pushed onto the queue; queue depth after enqueue | `queuedCount: number` |
| `onWindowSlide(activeCount, queuedCount)` | A queued caller is dequeued and granted a slot; fires before its promise resolves | `activeCount: number`, `queuedCount: number` |
| `onRelease(activeCount, totalExecuted)` | A concurrency slot is freed after an operation completes | `activeCount: number`, `totalExecuted: number` |
| `onDrainStart(activeCount, queuedCount)` | `drain()` is called and draining mode begins | `activeCount: number`, `queuedCount: number` |
| `onDrainComplete(totalExecuted)` | All operations finish and the throttle transitions draining → idle | `totalExecuted: number` |
| `onAbortStart(cancelledCount)` | `abort()` executes and is about to cancel operations | `cancelledCount: number` |
| `onAdaptiveAdjust(previousLimit, newLimit)` | Adaptive concurrency changes the concurrency limit | `previousLimit: number`, `newLimit: number` |
| `onReject(reason)` | An operation's async function throws or rejects | `reason: unknown` |

<<< ../../packages/throttle/examples/observedThrottle.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/throttle)
