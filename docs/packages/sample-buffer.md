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

`@studnicky/sample-buffer` exposes runtime operations at its root, schemas at `@studnicky/sample-buffer/entities`, and type contracts at `@studnicky/sample-buffer/interfaces`.

## Usage

Create a `SampleBuffer` with a fixed capacity, push numeric samples into it, and read back percentiles. When full, the oldest sample is evicted to make room for each new one:

<<< ../../packages/sample-buffer/examples/basicUsage.ts#usage

## Try it

### Lifecycle hooks

`TracedSampleBuffer` subclasses `SampleBuffer` and overrides seven hooks: `onOverflow`, `onEvict`, `onPush`, `onComputeStart`, `onComputeComplete`, `onPercentile`, and `onClear`. With capacity=3 and 5 pushes, watch two overflow+eviction pairs fire. The first `percentile(50)` triggers `computeStart` and `computeComplete`; the second call is a cache hit so those hooks do not fire again.

<RunnableExample src="packages/sample-buffer/examples/observedSampleBuffer" title="Observed sample buffer — lifecycle hook trace" />

## Public API

The package root exports `SampleBuffer` and `SampleBufferError`. Import schemas from `@studnicky/sample-buffer/entities` and the buffer contract from `@studnicky/sample-buffer/interfaces`. Construct buffers with `SampleBuffer.create({ capacity })`.

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

## Entities

`@studnicky/sample-buffer/entities` exports buffer option and observable-state schemas.

```typescript
import { SampleBufferOptionsEntity } from '@studnicky/sample-buffer/entities';
```

## Interfaces

`@studnicky/sample-buffer/interfaces` exports the sample-buffer contract.

```typescript
import type { SampleBufferInterface } from '@studnicky/sample-buffer/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `SampleBuffer` | Stores a fixed window of numeric samples and calculates percentiles. | `@studnicky/sample-buffer` |
| `SampleBufferError` | Represents sample-buffer failures. | `@studnicky/sample-buffer` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/sample-buffer)
