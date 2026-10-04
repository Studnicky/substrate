---
title: "@studnicky/clock"
description: Wall-clock and monotonic time with injectable providers for deterministic testing.
---

# @studnicky/clock

> Wall-clock and monotonic time primitives with injectable providers for deterministic testing.

## What it is

`@studnicky/clock` is a composable time primitive with real and virtual providers, monotonic reads, and bounded timing events. It supplies time and timing contracts; it does not define a bookstore workflow or metrics product.

## What it is for

Use it when Northstar Books needs consistent timestamps, deterministic tests for reservation windows, or a bounded timeline for one operation. Consumers select the clock, retain business rules, and decide where measurements go.

## Northstar Books examples

- **Timing event timeline** maps one book-search request to ordered timing events. It proves a caller can retain a bounded, clock-backed trace without coupling search to a telemetry vendor.
- **Timing lifecycle hooks** maps search timing instrumentation to protected observation hooks. It proves Northstar can emit timing observations without changing the tracker's contract.
- **Clock lifecycle hooks** maps a book-hold expiry calculation to real or virtual clock reads. It proves time-source behavior is observable and deterministic under a virtual counter.

## Install

```bash
pnpm add @studnicky/clock
```

## Usage

Build a `Clock` instance with a provider, then call `now()` for epoch-ms and `hrtime()` for nanosecond bigint. Both reads are monotonically clamped per instance:

<<< ../../packages/clock/examples/basic-usage.ts#usage

## Public API

Import `Clock`, `RealTimeClockProvider`, `VirtualClockProvider`, `VirtualTimeCounter`, `ClockConversionError`, and `ClockError` from `@studnicky/clock/node`; import `ClockProviderInterface` from `@studnicky/clock/interfaces`. Provider and counter option entities use `@studnicky/clock/entities`. Construct each stateful primitive through its `create(...)` method.

## Timing

`Timing` records bounded component-operation event timelines against an injected `Clock`. Its default uses `Clock.create(RealTimeClockProvider.create())`; pass a clock backed by `VirtualClockProvider` when a caller needs deterministic elapsed values.

<<< ../../packages/clock/examples/timing-basic-usage.ts#usage

`@studnicky/clock/timing` exports `Timing`, `TimingEvent`, `NoOpTiming`, `TIMING_STATUS`, and `TimingBuildError`. Timing schemas are available from `@studnicky/clock/timing/entities`; the shared tracker contract is available from `@studnicky/clock/timing/interfaces`.

### Timing lifecycle hooks

`Timing` provides protected `onInitialize`, `onEvent`, `onEvict`, `onClear`, and `onGetEvents` hooks for instrumentation. Hooks observe the injected clock values and do not select a host time source.

<<< ../../packages/clock/examples/timing-observedTiming.ts#usage

### Timing browser examples

<RunnableExample src="packages/clock/examples/timing-basic-usage" title="Timing event timeline" />

<RunnableExample src="packages/clock/examples/timing-observedTiming" title="Timing lifecycle hooks" />

## Virtual time control

`VirtualTimeCounter` and `VirtualClockProvider` give deterministic time control with no sleeping and no wall-clock dependency. Multiple independent or shared counters can drive separate clocks:

<<< ../../packages/clock/examples/virtual-time.ts#usage

## Custom providers

Implement `ClockProviderInterface` (two methods: `now(): number` and `hrtime(): bigint`) to inject any time source into `Clock`. Swapping the provider changes what `Clock` returns without touching consumers:

<<< ../../packages/clock/examples/custom-provider.ts#usage

## Observability hooks

Every stateful operation across `Clock`, `RealTimeClockProvider`, `VirtualClockProvider`, and `VirtualTimeCounter` exposes a protected lifecycle hook. Subclass any of these classes and override the relevant hook to add logging, metrics, or tracing without touching public API behavior.

| Hook                        | Class                   | When it fires                                                                                                    | Args                             |
| --------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `onNow(timestamp)`          | `Clock`                 | After each `now()` call, with the monotonically-clamped epoch-ms returned to the caller                          | `timestamp: number`              |
| `onHrtime(value)`           | `Clock`                 | After each `hrtime()` call, with the monotonically-clamped nanosecond bigint returned to the caller              | `value: bigint`                  |
| `onNow(timestamp)`          | `RealTimeClockProvider` | After each `now()` call, with the final epoch-ms (raw + offset) returned to the caller                           | `timestamp: number`              |
| `onHrtime(value)`           | `RealTimeClockProvider` | After each `hrtime()` call, with the final nanosecond bigint (performance.now() + offset) returned to the caller | `value: bigint`                  |
| `onNow(timestamp)`          | `VirtualClockProvider`  | After each `now()` call, with the virtual epoch-ms (clamped to 0 if negative) returned to the caller             | `timestamp: number`              |
| `onHrtime(value)`           | `VirtualClockProvider`  | After each `hrtime()` call, with the virtual nanosecond bigint returned to the caller                            | `value: bigint`                  |
| `onAdvance(deltaMs, nowMs)` | `VirtualTimeCounter`    | After each positive `advance()` call, with the applied delta and the resulting epoch-ms                          | `deltaMs: number, nowMs: number` |
| `onNowMs(value)`            | `VirtualTimeCounter`    | After each `nowMs()` call, with the current virtual epoch-ms returned to the caller                              | `value: number`                  |

<<< ../../packages/clock/examples/observedClock.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Extending

Override the protected `onNow` or `onHrtime` lifecycle hooks to observe clock reads. Inject a custom `ClockProviderInterface` when a consumer needs a different source; consumers continue to depend on `Clock`.

## Try it

The examples below run directly in the browser against the published package.

### Lifecycle hooks

Each `now()` and `hrtime()` read fires the corresponding hook on the counter, provider, and clock layers.

<RunnableExample src="packages/clock/examples/observedClock" title="Clock lifecycle hooks" />

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/clock)

## Entities

`@studnicky/clock/entities` exports every schema namespace in `src/entities`.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import { RealTimeClockProviderOptionsEntity } from "@studnicky/clock/entities";
```

## Interfaces

`@studnicky/clock/interfaces` exports every TypeScript interface in `src/interfaces`, including configuration and state contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import type { ClockProviderInterface } from "@studnicky/clock/interfaces";
```

## Public entrypoints

| Import path                                 | Use it when                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `@studnicky/clock/node`                     | A Northstar Books server or worker needs runtime clocks, providers, counters, and clock errors.                    |
| `@studnicky/clock/browser`                  | A browser bundle needs the same time primitive; it is a runtime alternative to `/node`, not another clock product. |
| `@studnicky/clock/entities`                 | A consumer needs clock provider and counter schemas as boundary contracts.                                         |
| `@studnicky/clock/interfaces`               | A consumer needs the typed clock-provider contract while supplying its own source.                                 |
| `@studnicky/clock/monotonic-now`            | A consumer needs validated nondecreasing millisecond values for ordered bookstore events.                          |
| `@studnicky/clock/monotonic-now/interfaces` | A consumer needs the monotonic-time port as a contract.                                                            |
| `@studnicky/clock/timing`                   | A book-search or checkout operation needs a bounded timing-event primitive.                                        |
| `@studnicky/clock/timing/entities`          | A consumer needs timing schemas as contracts at its boundary.                                                      |
| `@studnicky/clock/timing/interfaces`        | A consumer needs the timing tracker contract while composing its own observability.                                |

## Exports

| Symbol                   | Purpose                                               | Import path                                 |
| ------------------------ | ----------------------------------------------------- | ------------------------------------------- |
| `Clock`                  | Provides clock functionality.                         | `@studnicky/clock/node`                     |
| `ClockConversionError`   | Represents host timer conversion failures.            | `@studnicky/clock/node`                     |
| `ClockError`             | Represents clock failures.                            | `@studnicky/clock/node`                     |
| `MonotonicNow`           | Validates a finite, nondecreasing millisecond source. | `@studnicky/clock/monotonic-now`            |
| `MonotonicNowInterface`  | Defines the monotonic number-time port.               | `@studnicky/clock/monotonic-now/interfaces` |
| `ClockProviderInterface` | Defines the clock provider contract.                  | `@studnicky/clock/interfaces`               |
| `RealTimeClockProvider`  | Provides real time clock provider functionality.      | `@studnicky/clock/node`                     |
| `VirtualClockProvider`   | Provides virtual clock provider functionality.        | `@studnicky/clock/node`                     |
| `VirtualTimeCounter`     | Provides virtual time counter functionality.          | `@studnicky/clock/node`                     |
| `TIMING_STATUS`          | Defines supported timing event statuses.              | `@studnicky/clock/timing`                   |
| `NoOpTiming`             | Discards timing events.                               | `@studnicky/clock/timing`                   |
| `Timing`                 | Records a bounded elapsed-time event timeline.        | `@studnicky/clock/timing`                   |
| `TimingBuildError`       | Represents timing event build failures.               | `@studnicky/clock/timing`                   |
| `TimingEvent`            | Builds immutable timing event data.                   | `@studnicky/clock/timing`                   |
| `TimingInterface`        | Defines the timing tracker contract.                  | `@studnicky/clock/timing/interfaces`        |
