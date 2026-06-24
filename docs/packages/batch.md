---
title: '@studnicky/batch'
description: Batch concurrent execution — process items in controlled parallel groups.
---

# @studnicky/batch

> Batch concurrent execution for processing items in controlled batches.

## Install

```bash
pnpm add @studnicky/batch
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

`batchConcurrent.process` is an async generator that yields results batch-by-batch, enabling incremental processing and backpressure handling. Pass any async operation and a concurrency limit:

<<< ../../packages/batch/examples/basic-processing.ts#usage

## Partial-failure support

`batchConcurrent.processSettled` uses `Promise.allSettled` internally so a single rejection does not abort the batch or subsequent batches. Each yield produces a `PromiseSettledResult[]` covering both fulfilled values and rejection reasons:

<<< ../../packages/batch/examples/settled-processing.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/batch` | `batchConcurrent` |
| `@studnicky/batch/batch` | `batchConcurrent` (direct subpath) |
| `@studnicky/batch/constants` | Default batch configuration constants |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/batch)
