---
title: '@studnicky/batch'
description: Batch concurrent execution for processing items in controlled parallel groups.
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

## Observability hooks

Pass a `hooks` object inside the options argument to receive callbacks at every observable stage of a run. All fields are optional; omitting `hooks` entirely is fully non-breaking.

| Hook | When it fires | Args |
|------|--------------|------|
| `onBatchStart` | Once, before the first batch begins | `total: number` |
| `onItemStart` | When each item begins processing | `index: number` |
| `onItemSuccess` | When an item resolves | `index: number, result: TResult` |
| `onItemError` | When an item rejects | `index: number, error: unknown` |
| `onItemSettled` | After each item finishes (success or error), after `onItemSuccess`/`onItemError` | `index: number` |
| `onConcurrencySaturated` | At the start of each batch where all concurrency slots are occupied | _(none)_ |
| `onBatchComplete` | Once, after all items are processed | `stats: { total, succeeded, failed }` |

<<< ../../packages/batch/examples/observedBatch.ts#usage

`batch` never calls any logger or metrics library. The `hooks` option is the only observability seam — all callbacks are optional.

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/batch` | `batchConcurrent` |
| `@studnicky/batch/batch` | `batchConcurrent` (direct subpath) |
| `@studnicky/batch/constants` | Default batch configuration constants |

## Try it

`batchConcurrent` is a free-function primitive, not a class — its observability hooks are callback fields on the options object, not subclass overrides.

### Usage

Run a batch of items with concurrency 2 and watch results arrive batch-by-batch.

<RunnableExample src="packages/batch/examples/basic-processing" title="Batch concurrent processing" />

### Hooks

Every callback field fires in order — `onBatchStart`, then per-item `onItemStart`/`onItemSuccess` (or `onItemError`)/`onItemSettled`, then `onBatchComplete`. Item 3 rejects intentionally so `onItemError` is visible.

<RunnableExample src="packages/batch/examples/observedBatch" title="Batch hooks callbacks" />

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/batch)
