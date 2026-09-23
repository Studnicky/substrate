/**
 * Worker entry script for examples/observedWorkerPool.ts.
 *
 * Receives `{ n }`, reports progress at the halfway point, and resolves with the n-th
 * Fibonacci number computed iteratively (deliberately cheap — this fixture exists to
 * demonstrate the envelope contract, not to benchmark CPU-bound work).
 */
import { parentPort } from 'node:worker_threads';

interface FibonacciRequestInterface {
  readonly 'n': number;
}

if (parentPort === null) {
  throw new Error('observedWorkerPoolWorker must run in a worker thread');
}
const port = parentPort;

port.once('message', ({ n }: FibonacciRequestInterface) => {
  port.postMessage({ 'message': `computing fib(${String(n)})`, 'type': 'log' });

  let previous = 0;
  let current = 1;
  for (let i = 0; i < n; i += 1) {
    if (i === Math.floor(n / 2)) {
      port.postMessage({ 'percent': 50, 'type': 'progress' });
    }
    [previous, current] = [current, previous + current];
  }

  port.postMessage({ 'type': 'result', 'value': previous });
});
