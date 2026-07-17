/**
 * Test fixture worker proving WorkerPool's real pool reuse: unlike `echoWorker.mjs`
 * (which handles exactly one message via `parentPort.once` and then exits on its own),
 * this fixture keeps listening via `parentPort.on` so the same worker thread can service
 * many tasks in a row across a single `run()` call.
 *
 * Receives one message per task: `{ value, ms? }`.
 *   - Waits `ms` (default 0) before responding, to make reuse timing-agnostic.
 *   - Posts a 'result' envelope with `value` unchanged.
 */
import { parentPort } from 'node:worker_threads';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

parentPort.on('message', async (message) => {
  const { value, ms } = message;

  if (typeof ms === 'number' && ms > 0) {
    await delay(ms);
  }

  parentPort.postMessage({ 'type': 'result', 'value': value });
});
