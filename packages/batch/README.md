# @studnicky/batch

> Batch concurrent execution for processing items in controlled batches

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/batch)

Process arrays of items in parallel batches using async generators. Each batch completes before the next begins, giving you streaming results and natural backpressure without external dependencies.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/batch
```

## Usage

```typescript
import { Batch } from '@studnicky/batch';

const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Process up to 3 items at a time; yields results batch by batch
const users = Batch.create<Awaited<ReturnType<typeof fetchUser>>>(3);
for await (const batchResults of users.process(ids, async (id) => fetchUser(id))) {
  console.log('Batch complete:', batchResults);
}

// Collect all results
const all: number[] = [];
const doubles = Batch.create<number>(5);
for await (const batch of doubles.process(ids, async (id) => id * 2)) {
  all.push(...batch);
}
```

## Extending

Subclass `Batch` and override protected lifecycle hooks to observe processing without changing the worker function or batching behavior:

```typescript
import { Batch, BatchStatsEntity } from '@studnicky/batch';

class ObservedBatch extends Batch<string> {
  readonly completions: BatchStatsEntity.Type[] = [];

  static monitored(maxConcurrent: number): ObservedBatch {
    return new ObservedBatch(maxConcurrent);
  }

  protected override onBatchComplete(stats: BatchStatsEntity.Type): void {
    this.completions.push(stats);
  }
}

const batch = ObservedBatch.monitored(2);
const ids = [1, 2, 3];
for await (const results of batch.process(ids, async (id) => `item-${id}`)) {
  console.log(results);
}
```

Other hooks cover batch start, concurrency saturation, item start/success/error/settlement, and completion.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/batch

## License

MIT
