import type { MessagePort } from 'node:worker_threads';

import { RuntimeError } from '@studnicky/errors/node';
import { setTimeout } from 'node:timers';
import { parentPort } from 'node:worker_threads';

import { WorkerReply } from './WorkerReply.js';

interface TerminationRequestInterface {
  readonly 'crash'?: boolean;
  readonly 'error'?: string;
  readonly 'ms'?: number;
  readonly 'value': unknown;
}

class TerminationWorker {
  static start(): void {
    if (parentPort === null) {
      throw RuntimeError.create('terminationWorker must run in a worker thread');
    }
    const port = parentPort;

    port.on('message', (item: TerminationRequestInterface) => {
      TerminationWorker.handle(port, item);
    });
  }

  private static handle(port: MessagePort, item: TerminationRequestInterface): void {
    if (item.crash === true) {
      throw RuntimeError.create(item.error ?? 'termination worker crashed');
    }

    const respond = (): void => {
      WorkerReply.post(port, { 'type': 'result', 'value': item.value });
    };

    if (typeof item.ms === 'number' && item.ms > 0) {
      setTimeout(respond, item.ms);
    } else {
      respond();
    }
  }
}

TerminationWorker.start();
