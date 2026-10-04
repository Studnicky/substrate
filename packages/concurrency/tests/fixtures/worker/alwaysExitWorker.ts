import { RuntimeError } from '@studnicky/errors/node';
import { parentPort } from 'node:worker_threads';

class AlwaysExitWorker {
  static start(): void {
    if (parentPort === null) {
      throw RuntimeError.create('alwaysExitWorker must run in a worker thread');
    }

    parentPort.on('message', () => {
      process.exit(0);
    });
  }
}

AlwaysExitWorker.start();
