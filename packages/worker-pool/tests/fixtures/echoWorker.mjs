/**
 * Test fixture worker for @studnicky/worker-pool's own test suite.
 *
 * Receives one message: `{ value, ms?, error?, barrier?, barrierTarget? }`.
 *   - Waits `ms` (default 0) before responding, to make bounded-concurrency provable via timing.
 *   - Posts a 'log' and a 'progress' envelope along the way, to cover every envelope variant.
 *   - When `barrier` (a `SharedArrayBuffer` backing an `Int32Array`) and `barrierTarget` are both
 *     set, blocks via `Atomics.wait` until the shared counter at index 0 reaches `barrierTarget`
 *     before posting its final envelope. The parent increments that counter as it observes other
 *     workers' 'result' envelopes, so this makes ordering relative to sibling workers
 *     deterministic instead of a race between two independent worker threads' message delivery.
 *     Omitted entirely, this step is skipped and behavior is unchanged.
 *   - If `error` is set, posts an 'error' envelope with that string instead of a result.
 *   - Otherwise posts a 'result' envelope with `value` unchanged.
 */
import { parentPort } from 'node:worker_threads';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const barrierTimeoutMs = 5000;

function awaitBarrier(barrier, target) {
  const view = new Int32Array(barrier);
  const deadline = Date.now() + barrierTimeoutMs;

  let current = Atomics.load(view, 0);
  while (current < target) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) { break; }
    Atomics.wait(view, 0, current, remaining);
    current = Atomics.load(view, 0);
  }
}

parentPort.once('message', async (message) => {
  const { value, ms, error, barrier, barrierTarget } = message;

  parentPort.postMessage({ 'type': 'log', 'message': `received ${JSON.stringify(value)}` });

  if (typeof ms === 'number' && ms > 0) {
    await delay(ms);
  }

  parentPort.postMessage({ 'type': 'progress', 'percent': 100 });

  if (barrier instanceof SharedArrayBuffer && typeof barrierTarget === 'number') {
    awaitBarrier(barrier, barrierTarget);
  }

  if (typeof error === 'string') {
    parentPort.postMessage({ 'type': 'error', 'error': error });
    return;
  }

  parentPort.postMessage({ 'type': 'result', 'value': value });
});
