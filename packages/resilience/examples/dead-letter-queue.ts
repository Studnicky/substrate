/** dead-letter-queue — enqueue failed items; drain via async generator; close to end iteration. Run: npx tsx examples/dead-letter-queue.ts */

import assert from 'node:assert/strict';

// #region usage
import {
  DeadLetterQueue,
  DeadLetterQueueRetryGenerator,
  DlqClosedError,
  DlqFullError
} from '../src/index.js';

// --- Basic enqueue and drain ---
const dlq = new DeadLetterQueue<string>({ 'capacity': 5 });

dlq.enqueue('job-1', 'timeout');
dlq.enqueue('job-2', 'network error', new Error('ECONNREFUSED'));
console.log('Queue size after 2 enqueues:', dlq.size);

// Close before draining so the generator terminates instead of waiting.
dlq.close();

const collected: string[] = [];
for await (const entry of dlq.drain()) {
  collected.push(entry.item);
}
console.log('Drained items:', collected);
console.log('Queue size after drain:', dlq.size);

// --- Capacity enforcement ---
const bounded = new DeadLetterQueue<number>({ 'capacity': 2 });
bounded.enqueue(1, 'err');
bounded.enqueue(2, 'err');
console.log('Bounded queue size:', bounded.size);

// --- DeadLetterQueueRetryGenerator re-yields entries with a pause ---
const retryDlq = new DeadLetterQueue<string>();
retryDlq.enqueue('retry-job-1', 'failed');
retryDlq.enqueue('retry-job-2', 'failed');
retryDlq.close();

const gen = new DeadLetterQueueRetryGenerator(retryDlq, { 'intervalMs': 0 });
const retried: string[] = [];
for await (const entry of gen.generate()) {
  retried.push(entry.item);
}
console.log('Retried items:', retried);

// --- AbortSignal aborts the queue on construction ---
const controller = new AbortController();
controller.abort();
const abortedDlq = new DeadLetterQueue<string>({ 'signal': controller.signal });
const abortedEntries: string[] = [];
for await (const entry of abortedDlq.drain()) {
  abortedEntries.push(entry.item);
}
console.log('Aborted drain count:', abortedEntries.length);
// #endregion usage

assert.deepEqual(collected, ['job-1', 'job-2']);
assert.equal(dlq.size, 0);
assert.throws(() => { dlq.enqueue('job-3', 'late'); }, DlqClosedError);
assert.throws(() => { bounded.enqueue(3, 'overflow'); }, DlqFullError);
assert.deepEqual(retried, ['retry-job-1', 'retry-job-2']);
assert.equal(abortedEntries.length, 0);

console.log('dead-letter-queue: all assertions passed');
