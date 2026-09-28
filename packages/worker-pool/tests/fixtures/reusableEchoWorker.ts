/**
 * Test fixture worker proving WorkerPool's real pool reuse: unlike `echoWorker.ts`
 * (which handles exactly one message via `parentPort.once` and then exits on its own),
 * this fixture keeps listening via `parentPort.on` so the same worker thread can service
 * many tasks in a row across a single `run()` call.
 *
 * Receives one message per task: `{ value, ms?, error? }`.
 *   - Waits `ms` (default 0) before responding, to make reuse timing-agnostic.
 *   - Posts a 'result' envelope with `value` unchanged.
 */
import { parentPort } from 'node:worker_threads';

interface ReusableEchoRequestInterface {
  error?: string;
  ms?: number;
  value: unknown;
}

if (parentPort === null) {
  throw new Error('reusableEchoWorker must run in a worker thread');
}
const port = parentPort;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

port.on('message', async (message: ReusableEchoRequestInterface) => {
  const { error, value, ms } = message;

  if (typeof ms === 'number' && ms > 0) {
    await delay(ms);
  }

  if (typeof error === 'string') {
    port.postMessage({ 'type': 'error', 'error': error });
    return;
  }

  port.postMessage({ 'type': 'result', 'value': value });
});
