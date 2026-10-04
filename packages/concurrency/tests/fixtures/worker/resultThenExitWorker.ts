import { RuntimeError } from '@studnicky/errors/node';
import { parentPort } from 'node:worker_threads';

import { WorkerReply } from './WorkerReply.js';

interface ResultThenExitRequestInterface {
  readonly 'value': unknown;
}

class ResultThenExitWorker {
  static start(): void {
    if (parentPort === null) {
      throw RuntimeError.create('resultThenExitWorker must run in a worker thread');
    }
    const port = parentPort;

    port.on('message', (item: ResultThenExitRequestInterface) => {
      WorkerReply.post(port, { 'type': 'result', 'value': item.value });
      process.nextTick(() => {
        process.exit(0);
      });
    });
  }
}

ResultThenExitWorker.start();
