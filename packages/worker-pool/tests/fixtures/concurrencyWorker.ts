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
import type { MessagePort } from 'node:worker_threads';

import { RuntimeError } from '@studnicky/errors/node';
import { setTimeout } from 'node:timers/promises';
import { parentPort } from 'node:worker_threads';

import { WorkerReply } from './WorkerReply.js';

interface ConcurrencyRequestInterface {
  readonly 'counts': SharedArrayBuffer;
  readonly 'ms': number;
  readonly 'value': unknown;
}

class ConcurrencyWorker {
  static start(): void {
    if (parentPort === null) {
      throw RuntimeError.create('concurrencyWorker must run in a worker thread');
    }
    const port = parentPort;

    port.once('message', (message: ConcurrencyRequestInterface) => {
      void ConcurrencyWorker.handle(port, message);
    });
  }

  private static async handle(port: MessagePort, message: ConcurrencyRequestInterface): Promise<void> {
    const { counts, ms, value } = message;
    const view = new Int32Array(counts);

    const active = Atomics.add(view, 0, 1) + 1;

    let observedMaximum = Atomics.load(view, 1);
    while (active > observedMaximum) {
      const previous = Atomics.compareExchange(view, 1, observedMaximum, active);
      if (previous === observedMaximum) { break; }
      observedMaximum = Atomics.load(view, 1);
    }

    await setTimeout(ms);

    Atomics.sub(view, 0, 1);

    WorkerReply.post(port, { 'type': 'result', 'value': value });
  }
}

ConcurrencyWorker.start();
