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

## Usage

`batchConcurrent` is a namespace object with a `process` async generator. It yields results batch-by-batch, enabling incremental processing and backpressure handling.

```typescript
import { batchConcurrent } from '@studnicky/batch';

const urls = ['https://a.com', 'https://b.com', 'https://c.com', 'https://d.com'];

// Process 2 at a time, handle results as each batch completes
for await (const batchResults of batchConcurrent.process(urls, fetchData, 2)) {
  console.log('Batch complete:', batchResults);
}
```

### With options object

```typescript
for await (const results of batchConcurrent.process(items, processItem, { maxConcurrent: 5 })) {
  saveResults(results);
}
```

### Collect all results

```typescript
const allResults: string[] = [];
for await (const batch of batchConcurrent.process(items, processItem, 10)) {
  allResults.push(...batch);
}
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/batch` | `batchConcurrent` |
| `@studnicky/batch/batch` | `batchConcurrent` (direct subpath) |
| `@studnicky/batch/constants` | Default batch configuration constants |

## Extending

`batchConcurrent` is a pure-static namespace (`process` is a generator function). To add instrumentation, wrap the generator:

```typescript
import { batchConcurrent } from '@studnicky/batch';

async function* instrumentedBatch<T, R>(
  items: readonly T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): AsyncGenerator<R[]> {
  let batchIndex = 0;
  for await (const batch of batchConcurrent.process(items, fn, concurrency)) {
    metrics.increment('batch.complete', { batchIndex: batchIndex++ });
    yield batch;
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/batch)
