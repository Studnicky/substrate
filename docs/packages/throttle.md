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

Create a `Throttle` instance with `Throttle.create(config)`, then pass any operation to `execute`. Configuration is supplied once at construction and is not exposed through setters. The instance tracks stats and enforces the concurrency limit:

<<< ../../packages/throttle/examples/basicThrottle.ts#usage

## Drain

Call `drain()` to stop accepting new work and wait for all active and queued operations to finish gracefully:

<<< ../../packages/throttle/examples/drainThrottle.ts#usage

## Try it

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

## Public API

Import `Throttle`, its schema-backed entities, `ThrottleAbortedError`, `ThrottleDrainingError`, `ThrottleInterface`, and `ThrottleValidator` from `@studnicky/throttle`. The package root is the only public code entrypoint; defaults and scheduling constants are implementation details.

`Throttle.create(config)` validates and copies the supplied configuration into instance-owned state. Adaptive concurrency may adjust the instance's effective limit without mutating the caller's config object.

Use `ThrottleConfigEntity.validate(candidate)` at an untrusted configuration boundary. It validates against `ThrottleConfigEntity.Schema`, throws for invalid input, and narrows a valid candidate to `ThrottleConfigEntity.Type`.

`getStats()` returns `ThrottleStatsEntity.Type`. Use the root-exported compiled validator at trust boundaries:

<!-- inline-ts-ok: compact validation example -->
```typescript
import { Throttle, ThrottleStatsEntity } from '@studnicky/throttle';

const throttle = Throttle.create({ concurrencyLimit: 3 });
const stats = throttle.getStats();

if (!ThrottleStatsEntity.validate(stats)) {
  throw new Error('invalid throttle statistics');
}
```

## Observability hooks

Subclass `Throttle` and override any of the protected hooks below to add logging, metrics, or tracing without coupling the throttle core to any observability library.

| Hook | When it fires | Args |
|------|--------------|------|
| `onEnter(to, from)` | Every FSM state transition | `to: ThrottleStateEntity.Type`, `from: ThrottleStateEntity.Type` |
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
