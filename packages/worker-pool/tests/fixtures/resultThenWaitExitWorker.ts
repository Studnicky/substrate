import type { MessagePort } from 'node:worker_threads';

import { RuntimeError } from '@studnicky/errors/node';
import { parentPort } from 'node:worker_threads';

import { WorkerReply } from './WorkerReply.js';

interface ResultThenWaitExitRequestInterface {
  readonly 'exitAfterResult'?: boolean;
  readonly 'gate': SharedArrayBuffer;
  readonly 'value': unknown;
}

class ResultThenWaitExitWorker {
  static start(): void {
    if (parentPort === null) {
      throw RuntimeError.create('resultThenWaitExitWorker must run in a worker thread');
    }
    const port = parentPort;

    port.on('message', (item: ResultThenWaitExitRequestInterface) => {
      ResultThenWaitExitWorker.handle(port, item);
    });
  }

  private static handle(port: MessagePort, item: ResultThenWaitExitRequestInterface): void {
    WorkerReply.post(port, { 'type': 'result', 'value': item.value });
    if (item.exitAfterResult === true) {
      const gate = new Int32Array(item.gate);
      Atomics.wait(gate, 0, 0);
      process.exit(0);
    }
  }
}

ResultThenWaitExitWorker.start();
