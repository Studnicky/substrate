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

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/sample-buffer` | `SampleBuffer` |
| `@studnicky/sample-buffer/sample-buffer` | `SampleBuffer` (direct subpath) |
| `@studnicky/sample-buffer/interfaces` | `SampleBufferInterface` |
| `@studnicky/sample-buffer/constants` | Default capacity constants |

## Extending

Subclass `SampleBuffer` and override any lifecycle hook to observe buffer events. All hooks are no-ops by default — only override what you need:

<<< ../../packages/sample-buffer/examples/subclassHooks.ts#usage

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/sample-buffer)
