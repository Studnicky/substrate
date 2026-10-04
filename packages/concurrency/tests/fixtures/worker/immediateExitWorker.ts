import { RuntimeError } from '@studnicky/errors/node';
import { parentPort } from 'node:worker_threads';

class ImmediateExitWorker {
  static start(): void {
    if (parentPort === null) {
      throw RuntimeError.create('immediateExitWorker must run in a worker thread');
    }

    parentPort.on('message', () => {
      process.exit(0);
    });
  }
}

ImmediateExitWorker.start();
