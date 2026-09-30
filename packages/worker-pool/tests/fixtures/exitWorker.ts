import type { MessagePort } from 'node:worker_threads';

import { RuntimeError } from '@studnicky/errors/node';
import { existsSync, writeFileSync } from 'node:fs';
import { parentPort } from 'node:worker_threads';

import { WorkerReply } from './WorkerReply.js';

interface ExitRequestInterface {
  readonly 'exit'?: boolean;
  readonly 'stateFile'?: string;
  readonly 'value': unknown;
}

class ExitWorker {
  static start(): void {
    if (parentPort === null) {
      throw RuntimeError.create('exitWorker must run in a worker thread');
    }
    const port = parentPort;

    port.on('message', (item: ExitRequestInterface) => {
      ExitWorker.handle(port, item);
    });
  }

  private static handle(port: MessagePort, item: ExitRequestInterface): void {
    if (item.exit === true && typeof item.stateFile === 'string' && existsSync(item.stateFile) === false) {
      try {
        writeFileSync(item.stateFile, 'exited');
      } catch (cause) {
        throw RuntimeError.create('Exit worker could not record its exit state.', { 'cause': cause });
      }
      process.exit(0);
    }

    WorkerReply.post(port, { 'type': 'result', 'value': item.value });
  }
}

ExitWorker.start();
