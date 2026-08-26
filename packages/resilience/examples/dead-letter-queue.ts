/** dead-letter-queue — enqueue failed items; drain via async generator; close to end iteration. Run: npx tsx examples/dead-letter-queue.ts */

import assert from 'node:assert/strict';

// #region usage
import {
  DeadLetterQueue,
  DeadLetterQueueClosedError,
  DeadLetterQueueFullError,
  DeadLetterQueueRetryGenerator
} from '../src/index.js';

await (async function runDeadLetterQueueExample(): Promise<void> {
  // --- Basic enqueue and drain ---
  const deadLetterQueue = DeadLetterQueue.create<string>({ 'capacity': 5 });

  deadLetterQueue.enqueue('job-1', 'timeout');
  deadLetterQueue.enqueue('job-2', 'network error', new Error('ECONNREFUSED'));
  console.log('Queue size after 2 enqueues:', deadLetterQueue.size);

  // Close before draining so the generator terminates instead of waiting.
  deadLetterQueue.close();

  const collected: string[] = [];
  for await (const entry of deadLetterQueue.drain()) {
    collected.push(entry.item);
  }
  console.log('Drained items:', collected);
  console.log('Queue size after drain:', deadLetterQueue.size);

  // --- Capacity enforcement ---
  const bounded = DeadLetterQueue.create<number>({ 'capacity': 2 });
  bounded.enqueue(1, 'err');
  bounded.enqueue(2, 'err');
  console.log('Bounded queue size:', bounded.size);

  // --- DeadLetterQueueRetryGenerator re-yields entries with a pause ---
  const retryDeadLetterQueue = DeadLetterQueue.create<string>();
  retryDeadLetterQueue.enqueue('retry-job-1', 'failed');
  retryDeadLetterQueue.enqueue('retry-job-2', 'failed');
  retryDeadLetterQueue.close();

  const generator = DeadLetterQueueRetryGenerator.create({ 'deadLetterQueue': retryDeadLetterQueue, 'intervalMs': 0 });
  const retried: string[] = [];
  for await (const entry of generator.generate()) {
    retried.push(entry.item);
  }
  console.log('Retried items:', retried);

  // --- AbortSignal aborts the queue on construction ---
  const controller = new AbortController();
  controller.abort();
  const abortedDeadLetterQueue = DeadLetterQueue.create<string>({ 'signal': controller.signal });
  const abortedEntries: string[] = [];
  for await (const entry of abortedDeadLetterQueue.drain()) {
    abortedEntries.push(entry.item);
  }
  console.log('Aborted drain count:', abortedEntries.length);

  assert.deepEqual(collected, ['job-1', 'job-2']);
  assert.equal(deadLetterQueue.size, 0);
  assert.throws(() => { deadLetterQueue.enqueue('job-3', 'late'); }, DeadLetterQueueClosedError);
  assert.throws(() => { bounded.enqueue(3, 'overflow'); }, DeadLetterQueueFullError);
  assert.deepEqual(retried, ['retry-job-1', 'retry-job-2']);
  assert.equal(abortedEntries.length, 0);

  console.log('dead-letter-queue: all assertions passed');
})();
// #endregion usage
