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

`Batch.create(maxConcurrent)` returns a batch processor. Its `process` method is an async generator that yields results batch-by-batch, enabling incremental processing and backpressure handling. Pass any async operation:

<<< ../../packages/batch/examples/basic-processing.ts#usage

## Partial-failure support

`processSettled` uses `Promise.allSettled` internally so a single rejection does not abort the batch or subsequent batches. Each yield produces a `PromiseSettledResult[]` covering both fulfilled values and rejection reasons:

<<< ../../packages/batch/examples/settled-processing.ts#usage

## Observability hooks

Subclass `Batch` and override its protected lifecycle hooks to observe each stage of a run. Every hook is a no-op by default, so an un-subclassed `Batch` does no observability:

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

`batch` never calls any logger or metrics library. Overriding the protected lifecycle hooks is the only observability seam.

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/batch` | `Batch` |
| `@studnicky/batch/batch` | `Batch` (direct subpath) |
| `@studnicky/batch/constants` | Default batch configuration constants |

## Try it

`Batch` is a subclass-first primitive: configure concurrency through `Batch.create(maxConcurrent)` and add observability by overriding its protected lifecycle hooks.

### Usage

Run a batch of items with concurrency 2 and watch results arrive batch-by-batch.

<RunnableExample src="packages/batch/examples/basic-processing" title="Batch concurrent processing" />

### Hooks

Each overridden hook fires in order — `onBatchStart`, then per-item `onItemStart`/`onItemSuccess` (or `onItemError`)/`onItemSettled`, then `onBatchComplete`. Item 3 rejects intentionally so `onItemError` is visible.

<RunnableExample src="packages/batch/examples/observedBatch" title="Batch lifecycle hooks" />

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/batch)
