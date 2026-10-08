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

Northstar's book-hold expiry logic needs a trustworthy clock in production and a fully controllable one in tests — and both should answer to the exact same interface. Build a `Clock` from any provider and call `now()` for epoch-milliseconds or `hrtime()` for a nanosecond bigint; either reading is monotonically clamped per instance, so it can never appear to run backward. The example below reads a real-time clock twice to confirm it never decreases, then drives a `VirtualTimeCounter` through two manual advances to show the virtual clock landing on exactly the millisecond values you told it to.

<<< ../../packages/clock/examples/basic-usage.ts#usage

## Public API

Import `Clock`, `RealTimeClockProvider`, `VirtualClockProvider`, `VirtualTimeCounter`, `ClockConversionError`, and `ClockError` from `@studnicky/clock/node`; import `ClockProviderInterface` from `@studnicky/clock/interfaces`. Provider and counter option entities use `@studnicky/clock/entities`. Construct each stateful primitive through its `create(...)` method.

## Timing

When a book-search request crawls, Northstar needs to know which stage of the pipeline actually took the time — not just that the whole thing was slow. `Timing` records a bounded timeline of `component.operation` events against an injected `Clock`, defaulting to real time but happy to take a `VirtualClockProvider` when a test needs deterministic elapsed values instead. The example records a plain query event alongside a `start`/`complete`/`hit` cache sequence, then reads the resulting map back to confirm every named key — including the overall `durationMs` — is present with a sane numeric value.

<<< ../../packages/clock/examples/timing-basic-usage.ts#usage

`@studnicky/clock/timing` exports `Timing`, `TimingEvent`, `NoOpTiming`, `TIMING_STATUS`, and `TimingBuildError`. Timing schemas are available from `@studnicky/clock/timing/entities`; the shared tracker contract is available from `@studnicky/clock/timing/interfaces`.

### Timing lifecycle hooks

Watching a `Timing` tracker's internals — when it initializes, records, evicts, clears, or gets read — is a subclassing job, not a call to some external logger. `Timing` exposes protected `onInitialize`, `onEvent`, `onEvict`, `onClear`, and `onGetEvents` hooks that fire with the clock values already attached, leaving the choice of time source entirely to the host. The example below deliberately caps the tracker at three events so a fourth triggers eviction, clears it mid-run, and confirms every hook fired the expected number of times with the expected shapes.

<<< ../../packages/clock/examples/timing-observedTiming.ts#usage

### Timing browser examples

<RunnableExample src="packages/clock/examples/timing-basic-usage" title="Timing event timeline" />

<RunnableExample src="packages/clock/examples/timing-observedTiming" title="Timing lifecycle hooks" />

## Virtual time control

A test suite that actually sleeps to wait for timeouts is slow and flaky by design — `VirtualTimeCounter` and `VirtualClockProvider` let Northstar fast-forward time instead, deterministically, with zero real waiting. The example checks that `hrtime()` always agrees with `now()` scaled to nanoseconds, walks a counter through an irregular sequence of advances to prove it never reports time moving backward, and then shows two counters evolving completely independently before two clocks sharing one counter stay perfectly in sync.

<<< ../../packages/clock/examples/virtual-time.ts#usage

## Custom providers

`Clock` doesn't care where time comes from — it only needs something that implements two methods, `now(): number` and `hrtime(): bigint`. The example below builds a provider that always returns fixed values, another that counts up on every call, and then swaps between two fixed providers on the same `Clock` constructor to prove the behavior change lives entirely in the injected provider, never in `Clock` itself.

<<< ../../packages/clock/examples/custom-provider.ts#usage

## Observability hooks

Every read and every advance across `Clock`, `RealTimeClockProvider`, `VirtualClockProvider`, and `VirtualTimeCounter` fires its own protected hook, so Northstar can subclass any of them and add logging, metrics, or tracing without changing what the public API actually returns.

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

This demo stacks three layers of tracing — a counter, a provider, and a clock, each subclassed to record its own hook firings — then drives one scenario: read `now()`, advance 500ms, read again, advance 250ms, read a third time, then read `hrtime()` once. Watch the clock-level hook fire three times with the expected millisecond values while the counter-level `onAdvance` hook fires exactly twice, one per advance call.

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
