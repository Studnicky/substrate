/**
 * Test fixture worker proving WorkerPool's bounded concurrency deterministically via a
 * SharedArrayBuffer active-count, instead of wall-clock timing (which is flaky under CI/thread
 * contention because worker spin-up cost can dwarf a short artificial delay).
 *
 * Receives `{ counts, ms, value }` where `counts` is a shared `Int32Array(2)`:
 *   - counts[0] — live "currently active" counter, incremented on entry, decremented on exit.
 *   - counts[1] — running max of counts[0], updated via a compare-exchange loop.
 * Responds with a 'result' envelope carrying `value` unchanged once the artificial `ms` delay
 * (simulating work) elapses.
 */
import { parentPort } from 'node:worker_threads';

interface ConcurrencyRequestInterface {
  counts: SharedArrayBuffer;
  ms: number;
  value: unknown;
}

if (parentPort === null) {
  throw new Error('concurrencyWorker must run in a worker thread');
}
const port = parentPort;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

port.once('message', async (message: ConcurrencyRequestInterface) => {
  const { counts, ms, value } = message;
  const view = new Int32Array(counts);

  const active = Atomics.add(view, 0, 1) + 1;

  let observedMax = Atomics.load(view, 1);
  while (active > observedMax) {
    const previous = Atomics.compareExchange(view, 1, observedMax, active);
    if (previous === observedMax) { break; }
    observedMax = Atomics.load(view, 1);
  }

  await delay(ms);

  Atomics.sub(view, 0, 1);

  port.postMessage({ 'type': 'result', 'value': value });
});
