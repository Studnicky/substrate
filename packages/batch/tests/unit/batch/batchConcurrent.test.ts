/**
 * batchConcurrent Unit Tests
 *
 * Tests for batch concurrent async generator utility
 */

import {
  describe, it
} from 'node:test';

import { batchConcurrent } from '../../../src/batch/index.js';
import {
  collectBatches, deepStrictEqual, delay, rejects, strictEqual
} from '../../helpers/index.js';

const DEFAULT_MAX_CONCURRENT = 10;

void describe('batchConcurrent', () => {
  void describe('empty array handling', () => {
    void it('yields nothing for empty input', async () => {
      const batches: number[][] = [];

      for await (const batch of batchConcurrent.process([], async (item: number) => {
        return item * 2;
      })) {
        batches.push(batch);
      }

      deepStrictEqual(batches, []);
    });
  });

  void describe('single batch processing', () => {
    void it('yields single batch when count <= maxConcurrent', async () => {
      const items = [
        1,
        2,
        3
      ];
      const batches: number[][] = [];

      for await (const batch of batchConcurrent.process(items, async (item) => {
        return item * 2;
      }, 5)) {
        batches.push(batch);
      }

      strictEqual(batches.length, 1);
      deepStrictEqual(batches[0], [
        2,
        4,
        6
      ]);
    });

    void it('executes all items concurrently within batch', async () => {
      const items = [
        1,
        2,
        3,
        4,
        5
      ];
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
        deepStrictEqual(batch, [
          2,
          4,
          6,
          8,
          10
        ]);
      }

      strictEqual(executionOrder.length, 5);
    });
  });

  void describe('multi-batch processing', () => {
    void it('yields multiple batches when count > maxConcurrent', async () => {
      const items = [
        1,
        2,
        3,
        4,
        5
      ];
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

      strictEqual(batches.length, 3);
      deepStrictEqual(batches[0], [
        2,
        4
      ]);
      deepStrictEqual(batches[1], [
        6,
        8
      ]);
      deepStrictEqual(batches[2], [10]);
    });

    void it('waits for batch completion before yielding next', async () => {
      const items = [
        1,
        2,
        3,
        4
      ];
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
        strictEqual(batch.length, 2);
        batchTimestamps.push(Date.now() - startTime);
      }

      strictEqual(batchTimestamps.length, 2);
      // Second batch should complete ~50ms after first
      const first = batchTimestamps[0];
      const second = batchTimestamps[1];

      if (first === undefined || second === undefined) {
        throw new Error('Expected two batch timestamps');
      }
      const timeBetweenBatches = second - first;

      strictEqual(timeBetweenBatches >= 40, true);
    });
  });

  void describe('result order preservation', () => {
    void it('preserves input order within each batch', async () => {
      const items = [
        1,
        2,
        3,
        4
      ];
      const delays = [
        40,
        10,
        30,
        20
      ];

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

      deepStrictEqual(allResults, [
        10,
        20,
        30,
        40
      ]);
    });
  });

  void describe('default maxConcurrent', () => {
    void it('uses correct default maxConcurrent value', () => {
      strictEqual(typeof DEFAULT_MAX_CONCURRENT, 'number');
      strictEqual(DEFAULT_MAX_CONCURRENT, 10);
    });

    void it('uses defaultMaxConcurrent when not specified', async () => {
      const items = Array.from({ length: 15 }, (_, idx) => {
        return idx;
      });
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
        strictEqual(batch.length > 0, true);
      }

      strictEqual(maxConcurrentObserved, DEFAULT_MAX_CONCURRENT);
    });
  });

  void describe('error handling', () => {
    void it('propagates errors from operation', async () => {
      const items = [
        1,
        2,
        3
      ];

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
          strictEqual(Array.isArray(batch), true);
        }
      };

      await rejects(consumeGenerator, /Test error/u);
    });

    void it('stops yielding on first error in batch', async () => {
      const items = [
        1,
        2,
        3,
        4,
        5,
        6
      ];
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

      await rejects(consumeGenerator, /Test error/u);

      // Only first batch should have started processing
      deepStrictEqual(processed, [
        1,
        2
      ]);
      // No batches should have been yielded (error in first batch)
      deepStrictEqual(batchesReceived, []);
    });
  });

  void describe('type safety', () => {
    void it('handles different input and output types', async () => {
      const items = [
        'a',
        'b',
        'c'
      ];
      const generator = batchConcurrent.process(
        items,
        async (item) => {
          return item.codePointAt(0) as number;
        },
        2
      );
      const results = await collectBatches(generator);

      deepStrictEqual(results, [
        97,
        98,
        99
      ]);
    });

    void it('handles complex object types', async () => {
      const items = [
        {
          id: 1,
          name: 'Alice'
        },
        {
          id: 2,
          name: 'Bob'
        }
      ];

      const generator = batchConcurrent.process(
        items,
        async (item) => {
          return {
            ...item,
            processed: true
          };
        },
        2
      );
      const results = await collectBatches(generator);

      deepStrictEqual(results, [
        {
          id: 1,
          name: 'Alice',
          processed: true
        },
        {
          id: 2,
          name: 'Bob',
          processed: true
        }
      ]);
    });
  });

  void describe('incremental processing', () => {
    void it('allows processing results as batches complete', async () => {
      const items = [
        1,
        2,
        3,
        4,
        5,
        6
      ];
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

      strictEqual(processedBatches.length, 3);
      deepStrictEqual(processedBatches[0], [
        10,
        20
      ]);
      deepStrictEqual(processedBatches[1], [
        30,
        40
      ]);
      deepStrictEqual(processedBatches[2], [
        50,
        60
      ]);
    });

    void it('supports early termination via break', async () => {
      const items = [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ];
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
        strictEqual(batch.length, 2);
        batchCount++;
        if (batchCount >= 2) {
          break;
        }
      }

      strictEqual(batchCount, 2);
      // Only first 4 items should have been processed (2 batches of 2)
      deepStrictEqual(processed, [
        1,
        2,
        3,
        4
      ]);
    });
  });
});

void describe('batchConcurrentSettled', () => {
  void describe('empty array handling', () => {
    void it('yields nothing for empty input', async () => {
      const batches: Array<Array<PromiseSettledResult<number>>> = [];

      for await (const batch of batchConcurrent.processSettled([], async (item: number) => {
        return item * 2;
      })) {
        batches.push(batch);
      }

      deepStrictEqual(batches, []);
    });
  });

  void describe('successful operations', () => {
    void it('yields fulfilled results for successful operations', async () => {
      const items = [
        1,
        2,
        3
      ];
      const batches: Array<Array<PromiseSettledResult<number>>> = [];

      for await (const batch of batchConcurrent.processSettled(items, async (item) => {
        return item * 2;
      }, 5)) {
        batches.push(batch);
      }

      strictEqual(batches.length, 1);
      const firstBatch = batches[0];

      if (firstBatch === undefined) {
        throw new Error('Expected first batch');
      }
      strictEqual(firstBatch.length, 3);

      for (const result of firstBatch) {
        strictEqual(result.status, 'fulfilled');
      }

      const values = firstBatch.map((res) => {
        return (res as PromiseFulfilledResult<number>).value;
      });

      deepStrictEqual(values, [
        2,
        4,
        6
      ]);
    });
  });

  void describe('partial failure handling', () => {
    void it('continues processing when some operations fail', async () => {
      const items = [
        1,
        2,
        3
      ];
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

      strictEqual(batches.length, 1);
      const batch = batches[0];

      if (batch === undefined) {
        throw new Error('Expected first batch');
      }
      strictEqual(batch.length, 3);

      const result0 = batch[0];
      const result1 = batch[1];
      const result2 = batch[2];

      if (result0 === undefined || result1 === undefined || result2 === undefined) {
        throw new Error('Expected 3 results in batch');
      }

      strictEqual(result0.status, 'fulfilled');
      strictEqual((result0).value, 10);

      strictEqual(result1.status, 'rejected');
      const rejectedResult = result1;

      strictEqual((rejectedResult.reason as Error).message, 'Item 2 failed');

      strictEqual(result2.status, 'fulfilled');
      strictEqual((result2).value, 30);
    });

    void it('processes all batches even when errors occur', async () => {
      const items = [
        1,
        2,
        3,
        4,
        5,
        6
      ];
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

      strictEqual(batches.length, 3);
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

      const allDefined = b0r0 !== undefined && b0r1 !== undefined
        && b1r0 !== undefined && b1r1 !== undefined
        && b2r0 !== undefined && b2r1 !== undefined;

      if (!allDefined) {
        throw new Error('Expected 2 results in each batch');
      }

      // First batch: 1 succeeds, 2 fails
      strictEqual(b0r0.status, 'fulfilled');
      strictEqual(b0r1.status, 'rejected');

      // Second batch: 3 and 4 succeed
      strictEqual(b1r0.status, 'fulfilled');
      strictEqual(b1r1.status, 'fulfilled');

      // Third batch: 5 fails, 6 succeeds
      strictEqual(b2r0.status, 'rejected');
      strictEqual(b2r1.status, 'fulfilled');
    });

    void it('handles all operations failing', async () => {
      const items = [
        1,
        2,
        3
      ];
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

      strictEqual(batches.length, 2);

      for (const batch of batches) {
        for (const result of batch) {
          strictEqual(result.status, 'rejected');
        }
      }
    });
  });

  void describe('result order preservation', () => {
    void it('preserves input order within each batch', async () => {
      const items = [
        1,
        2,
        3,
        4
      ];
      const delays = [
        40,
        10,
        30,
        20
      ];
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

      strictEqual(batches.length, 1);
      const singleBatch = batches[0];

      if (singleBatch === undefined) {
        throw new Error('Expected single batch');
      }
      const values = singleBatch.map((res) => {
        return (res as PromiseFulfilledResult<number>).value;
      });

      deepStrictEqual(values, [
        10,
        20,
        30,
        40
      ]);
    });
  });

  void describe('default maxConcurrent', () => {
    void it('uses defaultMaxConcurrent when not specified', async () => {
      const items = Array.from({ length: 15 }, (_, idx) => {
        return idx;
      });
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
        strictEqual(batch.length > 0, true);
      }

      strictEqual(maxConcurrentObserved, DEFAULT_MAX_CONCURRENT);
    });
  });

  void describe('type safety', () => {
    void it('handles different input and output types', async () => {
      const items = [
        'a',
        'b',
        'c'
      ];
      const batches: Array<Array<PromiseSettledResult<number>>> = [];

      for await (const batch of batchConcurrent.processSettled(
        items,
        async (item) => {
          return item.codePointAt(0) as number;
        },
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

      deepStrictEqual(allValues, [
        97,
        98,
        99
      ]);
    });
  });
});
