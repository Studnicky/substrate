/**
 * Test fixture worker for @studnicky/worker-pool's own test suite.
 *
 * Receives one message: `{ value, ms?, error? }`.
 *   - Waits `ms` (default 0) before responding, to make bounded-concurrency provable via timing.
 *   - Posts a 'log' and a 'progress' envelope along the way, to cover every envelope variant.
 *   - If `error` is set, posts an 'error' envelope with that string instead of a result.
 *   - Otherwise posts a 'result' envelope with `value` unchanged.
 */
import { parentPort } from 'node:worker_threads';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

parentPort.once('message', async (message) => {
  const { value, ms, error } = message;

  parentPort.postMessage({ 'type': 'log', 'message': `received ${JSON.stringify(value)}` });

  if (typeof ms === 'number' && ms > 0) {
    await delay(ms);
  }

  parentPort.postMessage({ 'type': 'progress', 'percent': 100 });

  if (typeof error === 'string') {
    parentPort.postMessage({ 'type': 'error', 'error': error });
    return;
  }

  parentPort.postMessage({ 'type': 'result', 'value': value });
});
