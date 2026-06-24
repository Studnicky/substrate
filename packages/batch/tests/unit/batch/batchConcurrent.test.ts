/**
 * batchConcurrent Unit Tests
 *
 * Tests for batch concurrent async generator utility
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { batchConcurrent } from '../../../src/batch/index.js';
import {
  collectBatches, delay
} from '../../helpers/index.js';

const DEFAULT_MAX_CONCURRENT = 10;

// ── batchConcurrent.process ──────────────────────────────────────────────────

const processEmptyScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'process yields nothing for empty input',
    exec: async () => {
      const batches: number[][] = [];

      for await (const batch of batchConcurrent.process([], async (item: number) => item * 2)) {
        batches.push(batch);
      }

      assert.deepStrictEqual(batches, []);
    },
  },
];

for (const { description, exec } of processEmptyScenarios) {
  it(description, exec);
}

const processSingleBatchScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'process yields single batch when count <= maxConcurrent',
    exec: async () => {
      const items = [1, 2, 3];
      const batches: number[][] = [];

      for await (const batch of batchConcurrent.process(items, async (item) => item * 2, 5)) {
        batches.push(batch);
      }

      assert.strictEqual(batches.length, 1);
      assert.deepStrictEqual(batches[0], [2, 4, 6]);
    },
  },
  {
    description: 'process executes all items concurrently within batch',
    exec: async () => {
      const items = [1, 2, 3, 4, 5];
      const executionOrder: number[] = [];

      for await (const batch of batchConcurrent.process(
        items,
        async (item) => {
          executionOrder.push(item);
          await delay(10);

          return item * 2;
        },
        5
      )) {
        assert.deepStrictEqual(batch, [2, 4, 6, 8, 10]);
      }

      assert.strictEqual(executionOrder.length, 5);
    },
  },
];

for (const { description, exec } of processSingleBatchScenarios) {
  it(description, exec);
}

const processMultiBatchScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'process yields multiple batches when count > maxConcurrent',
    exec: async () => {
      const items = [1, 2, 3, 4, 5];
      const batches: number[][] = [];

      for await (const batch of batchConcurrent.process(
        items,
        async (item) => {
          await delay(10);

          return item * 2;
        },
        2
      )) {
        batches.push(batch);
      }

      assert.strictEqual(batches.length, 3);
      assert.deepStrictEqual(batches[0], [2, 4]);
      assert.deepStrictEqual(batches[1], [6, 8]);
      assert.deepStrictEqual(batches[2], [10]);
    },
  },
];

for (const { description, exec } of processMultiBatchScenarios) {
  it(description, exec);
}

const processOrderScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'process preserves input order within each batch',
    exec: async () => {
      const items = [1, 2, 3, 4];
      const delays = [40, 10, 30, 20];

      const generator = batchConcurrent.process(
        items,
        async (item) => {
          const index = items.indexOf(item);

          await delay(delays[index]);

          return item * 10;
        },
        4
      );
      const allResults = await collectBatches(generator);

      assert.deepStrictEqual(allResults, [10, 20, 30, 40]);
    },
  },
];

for (const { description, exec } of processOrderScenarios) {
  it(description, exec);
}

// Stateful/timing tests — kept as flat it() blocks

it('process uses defaultMaxConcurrent when not specified', async () => {
  const items = Array.from({ length: 15 }, (_, idx) => idx);
  let maxConcurrentObserved = 0;
  let currentConcurrent = 0;

  for await (const batch of batchConcurrent.process(
    items,
    async (item) => {
      currentConcurrent++;
      if (currentConcurrent > maxConcurrentObserved) {
        maxConcurrentObserved = currentConcurrent;
      }
      await delay(10);
      currentConcurrent--;

      return item;
    }
  )) {
    assert.ok(batch.length > 0);
  }

  assert.strictEqual(maxConcurrentObserved, DEFAULT_MAX_CONCURRENT);
});

it('process waits for batch completion before yielding next', async () => {
  const items = [1, 2, 3, 4];
  const batchTimestamps: number[] = [];
  const startTime = Date.now();

  for await (const batch of batchConcurrent.process(
    items,
    async (item) => {
      await delay(50);

      return item;
    },
    2
  )) {
    assert.strictEqual(batch.length, 2);
    batchTimestamps.push(Date.now() - startTime);
  }

  assert.strictEqual(batchTimestamps.length, 2);

  const first = batchTimestamps[0];
  const second = batchTimestamps[1];

  if (first === undefined || second === undefined) {
    throw new Error('Expected two batch timestamps');
  }
  const timeBetweenBatches = second - first;

  assert.ok(timeBetweenBatches >= 40);
});

it('process propagates errors from operation', async () => {
  const items = [1, 2, 3];

  const consumeGenerator = async (): Promise<void> => {
    for await (const batch of batchConcurrent.process(
      items,
      async (item) => {
        if (item === 2) {
          throw new Error('Test error');
        }

        return item;
      },
      2
    )) {
      assert.ok(Array.isArray(batch));
    }
  };

  await assert.rejects(consumeGenerator, /Test error/u);
});

it('process stops yielding on first error', async () => {
  const items = [1, 2, 3, 4, 5, 6];
  const processed: number[] = [];
  const batchesReceived: number[][] = [];

  const consumeGenerator = async (): Promise<void> => {
    for await (const batch of batchConcurrent.process(
      items,
      async (item) => {
        processed.push(item);
        await delay(10);
        if (item === 2) {
          throw new Error('Test error');
        }

        return item;
      },
      2
    )) {
      batchesReceived.push(batch);
    }
  };

  await assert.rejects(consumeGenerator, /Test error/u);

  assert.deepStrictEqual(processed, [1, 2]);
  assert.deepStrictEqual(batchesReceived, []);
});

const processTypeScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'process handles different input and output types',
    exec: async () => {
      const items = ['a', 'b', 'c'];
      const generator = batchConcurrent.process(
        items,
        async (item) => item.codePointAt(0) as number,
        2
      );
      const results = await collectBatches(generator);

      assert.deepStrictEqual(results, [97, 98, 99]);
    },
  },
  {
    description: 'process handles complex object types',
    exec: async () => {
      const items = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];

      const generator = batchConcurrent.process(
        items,
        async (item) => ({ ...item, processed: true }),
        2
      );
      const results = await collectBatches(generator);

      assert.deepStrictEqual(results, [
        { id: 1, name: 'Alice', processed: true },
        { id: 2, name: 'Bob', processed: true },
      ]);
    },
  },
];

for (const { description, exec } of processTypeScenarios) {
  it(description, exec);
}

const processIncrementalScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'process allows processing results as batches complete',
    exec: async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const processedBatches: number[][] = [];

      for await (const batch of batchConcurrent.process(
        items,
        async (item) => {
          await delay(10);

          return item * 10;
        },
        2
      )) {
        processedBatches.push([...batch]);
      }

      assert.strictEqual(processedBatches.length, 3);
      assert.deepStrictEqual(processedBatches[0], [10, 20]);
      assert.deepStrictEqual(processedBatches[1], [30, 40]);
      assert.deepStrictEqual(processedBatches[2], [50, 60]);
    },
  },
  {
    description: 'process supports early termination via break',
    exec: async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8];
      const processed: number[] = [];
      let batchCount = 0;

      for await (const batch of batchConcurrent.process(
        items,
        async (item) => {
          processed.push(item);
          await delay(10);

          return item;
        },
        2
      )) {
        assert.strictEqual(batch.length, 2);
        batchCount++;
        if (batchCount >= 2) {
          break;
        }
      }

      assert.strictEqual(batchCount, 2);
      assert.deepStrictEqual(processed, [1, 2, 3, 4]);
    },
  },
];

for (const { description, exec } of processIncrementalScenarios) {
  it(description, exec);
}

const processErrorValidationScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'process throws BatchError for zero maxConcurrent',
    exec: async () => {
      await assert.rejects(
        async () => {
          for await (const _ of batchConcurrent.process([1, 2, 3], async (item) => item, 0)) {
            // should not yield
          }
        },
        /maxConcurrent must be a positive integer/u
      );
    },
  },
  {
    description: 'process throws BatchError for negative maxConcurrent',
    exec: async () => {
      await assert.rejects(
        async () => {
          for await (const _ of batchConcurrent.process([1, 2, 3], async (item) => item, -1)) {
            // should not yield
          }
        },
        /maxConcurrent must be a positive integer/u
      );
    },
  },
  {
    description: 'process throws BatchError for non-integer maxConcurrent',
    exec: async () => {
      await assert.rejects(
        async () => {
          for await (const _ of batchConcurrent.process([1, 2, 3], async (item) => item, 1.5)) {
            // should not yield
          }
        },
        /maxConcurrent must be a positive integer/u
      );
    },
  },
];

for (const { description, exec } of processErrorValidationScenarios) {
  it(description, exec);
}

// ── batchConcurrentSettled ───────────────────────────────────────────────────

const settledEmptyScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'processSettled yields nothing for empty input',
    exec: async () => {
      const batches: Array<Array<PromiseSettledResult<number>>> = [];

      for await (const batch of batchConcurrent.processSettled([], async (item: number) => item * 2)) {
        batches.push(batch);
      }

      assert.deepStrictEqual(batches, []);
    },
  },
];

for (const { description, exec } of settledEmptyScenarios) {
  it(description, exec);
}

const settledSuccessScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'processSettled yields fulfilled results for successful operations',
    exec: async () => {
      const items = [1, 2, 3];
      const batches: Array<Array<PromiseSettledResult<number>>> = [];

      for await (const batch of batchConcurrent.processSettled(items, async (item) => item * 2, 5)) {
        batches.push(batch);
      }

      assert.strictEqual(batches.length, 1);
      const firstBatch = batches[0];

      if (firstBatch === undefined) {
        throw new Error('Expected first batch');
      }
      assert.strictEqual(firstBatch.length, 3);

      for (const result of firstBatch) {
        assert.strictEqual(result.status, 'fulfilled');
      }

      const values = firstBatch.map((res) => (res as PromiseFulfilledResult<number>).value);

      assert.deepStrictEqual(values, [2, 4, 6]);
    },
  },
];

for (const { description, exec } of settledSuccessScenarios) {
  it(description, exec);
}

const settledPartialFailureScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'processSettled continues processing when some operations fail',
    exec: async () => {
      const items = [1, 2, 3];
      const batches: Array<Array<PromiseSettledResult<number>>> = [];

      for await (const batch of batchConcurrent.processSettled(
        items,
        async (item) => {
          if (item === 2) {
            throw new Error('Item 2 failed');
          }

          return item * 10;
        },
        3
      )) {
        batches.push(batch);
      }

      assert.strictEqual(batches.length, 1);
      const batch = batches[0];

      if (batch === undefined) {
        throw new Error('Expected first batch');
      }
      assert.strictEqual(batch.length, 3);

      const result0 = batch[0];
      const result1 = batch[1];
      const result2 = batch[2];

      if (result0 === undefined || result1 === undefined || result2 === undefined) {
        throw new Error('Expected 3 results in batch');
      }

      assert.strictEqual(result0.status, 'fulfilled');
      assert.strictEqual((result0 as PromiseFulfilledResult<number>).value, 10);

      assert.strictEqual(result1.status, 'rejected');
      assert.strictEqual((result1 as PromiseRejectedResult).reason.message, 'Item 2 failed');

      assert.strictEqual(result2.status, 'fulfilled');
      assert.strictEqual((result2 as PromiseFulfilledResult<number>).value, 30);
    },
  },
  {
    description: 'processSettled processes all batches even when errors occur',
    exec: async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const batches: Array<Array<PromiseSettledResult<number>>> = [];

      for await (const batch of batchConcurrent.processSettled(
        items,
        async (item) => {
          if (item === 2 || item === 5) {
            throw new Error(`Item ${item} failed`);
          }

          return item * 10;
        },
        2
      )) {
        batches.push(batch);
      }

      assert.strictEqual(batches.length, 3);
      const batch0 = batches[0];
      const batch1 = batches[1];
      const batch2 = batches[2];

      if (batch0 === undefined || batch1 === undefined || batch2 === undefined) {
        throw new Error('Expected 3 batches');
      }

      const b0r0 = batch0[0];
      const b0r1 = batch0[1];
      const b1r0 = batch1[0];
      const b1r1 = batch1[1];
      const b2r0 = batch2[0];
      const b2r1 = batch2[1];

      if (
        b0r0 === undefined || b0r1 === undefined
        || b1r0 === undefined || b1r1 === undefined
        || b2r0 === undefined || b2r1 === undefined
      ) {
        throw new Error('Expected 2 results in each batch');
      }

      // First batch: 1 succeeds, 2 fails
      assert.strictEqual(b0r0.status, 'fulfilled');
      assert.strictEqual(b0r1.status, 'rejected');

      // Second batch: 3 and 4 succeed
      assert.strictEqual(b1r0.status, 'fulfilled');
      assert.strictEqual(b1r1.status, 'fulfilled');

      // Third batch: 5 fails, 6 succeeds
      assert.strictEqual(b2r0.status, 'rejected');
      assert.strictEqual(b2r1.status, 'fulfilled');
    },
  },
  {
    description: 'processSettled handles all operations failing',
    exec: async () => {
      const items = [1, 2, 3];
      const batches: Array<Array<PromiseSettledResult<number>>> = [];

      for await (const batch of batchConcurrent.processSettled(
        items,
        async (item) => {
          throw new Error(`Item ${item} failed`);
        },
        2
      )) {
        batches.push(batch);
      }

      assert.strictEqual(batches.length, 2);

      for (const batch of batches) {
        for (const result of batch) {
          assert.strictEqual(result.status, 'rejected');
        }
      }
    },
  },
];

for (const { description, exec } of settledPartialFailureScenarios) {
  it(description, exec);
}

const settledOrderScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'processSettled preserves input order within each batch',
    exec: async () => {
      const items = [1, 2, 3, 4];
      const delays = [40, 10, 30, 20];
      const batches: Array<Array<PromiseSettledResult<number>>> = [];

      for await (const batch of batchConcurrent.processSettled(
        items,
        async (item) => {
          const index = items.indexOf(item);

          await delay(delays[index]);

          return item * 10;
        },
        4
      )) {
        batches.push(batch);
      }

      assert.strictEqual(batches.length, 1);
      const singleBatch = batches[0];

      if (singleBatch === undefined) {
        throw new Error('Expected single batch');
      }
      const values = singleBatch.map((res) => (res as PromiseFulfilledResult<number>).value);

      assert.deepStrictEqual(values, [10, 20, 30, 40]);
    },
  },
];

for (const { description, exec } of settledOrderScenarios) {
  it(description, exec);
}

// Stateful test — kept as flat it() block

it('processSettled uses defaultMaxConcurrent when not specified', async () => {
  const items = Array.from({ length: 15 }, (_, idx) => idx);
  let maxConcurrentObserved = 0;
  let currentConcurrent = 0;

  for await (const batch of batchConcurrent.processSettled(
    items,
    async (item) => {
      currentConcurrent++;
      if (currentConcurrent > maxConcurrentObserved) {
        maxConcurrentObserved = currentConcurrent;
      }
      await delay(10);
      currentConcurrent--;

      return item;
    }
  )) {
    assert.ok(batch.length > 0);
  }

  assert.strictEqual(maxConcurrentObserved, DEFAULT_MAX_CONCURRENT);
});

const settledTypeScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'processSettled handles different input and output types',
    exec: async () => {
      const items = ['a', 'b', 'c'];
      const batches: Array<Array<PromiseSettledResult<number>>> = [];

      for await (const batch of batchConcurrent.processSettled(
        items,
        async (item) => item.codePointAt(0) as number,
        2
      )) {
        batches.push(batch);
      }

      const allValues: number[] = [];

      for (const batch of batches) {
        for (const result of batch) {
          if (result.status === 'fulfilled') {
            allValues.push(result.value);
          }
        }
      }

      assert.deepStrictEqual(allValues, [97, 98, 99]);
    },
  },
];

for (const { description, exec } of settledTypeScenarios) {
  it(description, exec);
}
