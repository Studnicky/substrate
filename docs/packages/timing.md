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

Build a `Timing` instance with the builder, then record `component.operation` and `component.operation.status` events. Elapsed milliseconds are collected in a flat map keyed by event name:

<<< ../../packages/timing/examples/basic-usage.ts#usage

### No-op for production disabling

`NoOpTiming` implements the same interface with zero overhead; all calls are accepted and discarded:

<<< ../../packages/timing/examples/noop-timing.ts#usage

## Try it

### Builder

`Timing.builder().maxEvents(50).build()` constructs the tracker. Press Execute to record a `GraphAdapter.query` event plus three `CacheService.get` events with `start`, `complete`, and `hit` statuses. The output map shows each event key with its elapsed-milliseconds value relative to instance creation.

<RunnableExample src="packages/timing/examples/basic-usage" title="Basic timing — builder, events, elapsed-ms output" />

### Lifecycle hooks

`ObservedTiming` subclasses `Timing` and overrides five hooks: `onInitialize`, `onEvent`, `onEvict`, `onClear`, and `onGetEvents`. With `maxEvents=3` the cache holds three entries; the fourth event triggers `onEvict` for the oldest. Watch the hook trace print for every operation, including the two `getEvents()` calls and the single `clear()`.

<RunnableExample src="packages/timing/examples/observedTiming" title="Observed timing — lifecycle hook trace" />

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

`Timing` exposes five protected observability hooks. Subclass and override them to intercept events for metrics export, structured logging, or test assertions:

<<< ../../packages/timing/examples/instrumented-timing.ts#usage

## Observability hooks

| Hook | When it fires | Args |
|------|---------------|------|
| `onInitialize` | After the instance is fully initialized | `startTime: bigint` |
| `onEvent` | After an event is added to the cache | `data: TimingEventDataType, timestamp: bigint` |
| `onEvict` | Before an event is evicted from the cache | `name: string` |
| `onClear` | Before the cache is cleared | _(none)_ |
| `onGetEvents` | At the start of each `getEvents()` call | `eventCount: number` |

<<< ../../packages/timing/examples/observedTiming.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/timing)
