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

`NoOpTiming` implements the same interface with zero overhead — all calls are accepted and discarded:

<<< ../../packages/timing/examples/noop-timing.ts#usage

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

`Timing` exposes a protected `onEvent` hook. Subclass and override it to intercept events for metrics export, structured logging, or test assertions:

<<< ../../packages/timing/examples/instrumented-timing.ts#usage

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/timing)
