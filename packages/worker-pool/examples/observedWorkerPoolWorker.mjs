/**
 * Worker entry script for examples/observedWorkerPool.ts.
 *
 * Receives `{ n }`, reports progress at the halfway point, and resolves with the n-th
 * Fibonacci number computed iteratively (deliberately cheap — this fixture exists to
 * demonstrate the envelope contract, not to benchmark CPU-bound work).
 */
import { parentPort } from 'node:worker_threads';

parentPort.once('message', ({ n }) => {
  parentPort.postMessage({ 'type': 'log', 'message': `computing fib(${String(n)})` });

  let previous = 0;
  let current = 1;
  for (let i = 0; i < n; i += 1) {
    if (i === Math.floor(n / 2)) {
      parentPort.postMessage({ 'type': 'progress', 'percent': 50 });
    }
    [previous, current] = [current, previous + current];
  }

  parentPort.postMessage({ 'type': 'result', 'value': previous });
});
