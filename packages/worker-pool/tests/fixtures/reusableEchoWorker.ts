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
import type { MessagePort } from 'node:worker_threads';

import { RuntimeError } from '@studnicky/errors/node';
import { setTimeout } from 'node:timers/promises';
import { parentPort } from 'node:worker_threads';

import { WorkerReply } from './WorkerReply.js';

interface ReusableEchoRequestInterface {
  readonly 'error'?: string;
  readonly 'ms'?: number;
  readonly 'value': unknown;
}

class ReusableEchoWorker {
  static start(): void {
    if (parentPort === null) {
      throw RuntimeError.create('reusableEchoWorker must run in a worker thread');
    }
    const port = parentPort;

    port.on('message', (message: ReusableEchoRequestInterface) => {
      void ReusableEchoWorker.handle(port, message);
    });
  }

  private static async handle(port: MessagePort, message: ReusableEchoRequestInterface): Promise<void> {
    const { error, ms, value } = message;

    if (typeof ms === 'number' && ms > 0) {
      await setTimeout(ms);
    }

    if (typeof error === 'string') {
      WorkerReply.post(port, { 'error': error, 'type': 'error' });
    } else {
      WorkerReply.post(port, { 'type': 'result', 'value': value });
    }
  }
}

ReusableEchoWorker.start();
