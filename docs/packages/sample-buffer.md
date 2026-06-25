---
title: '@studnicky/sample-buffer'
description: Fixed-capacity numeric sample buffer with percentile calculation.
---

# @studnicky/sample-buffer

> Fixed-capacity circular buffer for numeric samples with percentile calculation.

## Install

```bash
pnpm add @studnicky/sample-buffer
```

## Usage

Create a `SampleBuffer` with a fixed capacity, push numeric samples into it, and read back percentiles. When full, the oldest sample is evicted to make room for each new one:

<<< ../../packages/sample-buffer/examples/basicUsage.ts#usage

## Try it

### Builder

`SampleBuffer.builder().withCapacity(5).build()` constructs the buffer through the fluent builder. Press Execute to fill the capacity-5 buffer, compute p50 and p95, then push two more samples past capacity (oldest two are evicted, length holds at 5) and clear.

<RunnableExample src="packages/sample-buffer/examples/builder-sample-buffer" title="Builder — fluent sample buffer construction" />

### Lifecycle hooks

`TracedSampleBuffer` subclasses `SampleBuffer` and overrides seven hooks: `onOverflow`, `onEvict`, `onPush`, `onComputeStart`, `onComputeComplete`, `onPercentile`, and `onClear`. With capacity=3 and 5 pushes, watch two overflow+eviction pairs fire. The first `percentile(50)` triggers `computeStart` and `computeComplete`; the second call is a cache hit so those hooks do not fire again.

<RunnableExample src="packages/sample-buffer/examples/observedSampleBuffer" title="Observed sample buffer — lifecycle hook trace" />

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/sample-buffer` | `SampleBuffer` |
| `@studnicky/sample-buffer/sample-buffer` | `SampleBuffer` (direct subpath) |
| `@studnicky/sample-buffer/interfaces` | `SampleBufferInterface` |
| `@studnicky/sample-buffer/constants` | Default capacity constants |

## Extending

Subclass `SampleBuffer` and override any lifecycle hook to observe buffer events. All hooks are no-ops by default; only override what you need:

<<< ../../packages/sample-buffer/examples/subclassHooks.ts#usage

## Observability hooks

Subclass `SampleBuffer` and override any hook to observe the full push/evict/compute lifecycle. All hooks fire synchronously, after state mutation, with no try/catch.

| Hook | When it fires | Args |
|---|---|---|
| `onOverflow(value)` | Push onto a full buffer, before eviction | `value: number` — the incoming sample |
| `onEvict(oldValue)` | Full-buffer push path, after overflow, before overwrite | `oldValue: number` — the sample being replaced |
| `onPush(value, evicted)` | End of `push()`, after length/head updated | `value: number`, `evicted: boolean` |
| `onComputeStart(length)` | Start of `buildSortedSamples()` — cache miss in `percentile()` | `length: number` — samples about to be sorted |
| `onComputeComplete(length, sorted)` | End of `buildSortedSamples()`, after sort | `length: number`, `sorted: readonly number[]` |
| `onPercentile(pct, result)` | Before returning from `percentile()`, non-empty buffer only | `pct: number`, `result: number` |
| `onClear()` | Start of `clear()`, before state reset | none |

<<< ../../packages/sample-buffer/examples/observedSampleBuffer.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/sample-buffer)
