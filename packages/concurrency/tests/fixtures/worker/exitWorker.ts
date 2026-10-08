import type { MessagePort } from 'node:worker_threads';

import { RuntimeError } from '@studnicky/errors/node';
import { writeFileSync } from 'node:fs';
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
    if (item.exit === true && typeof item.stateFile === 'string' && ExitWorker.claimExitState(item.stateFile)) {
      process.exit(0);
    }

    WorkerReply.post(port, { 'type': 'result', 'value': item.value });
  }

  /** Atomically claims the exit-state file: true if this call created it, false if it already existed. Exclusive create removes the check-then-write race between the existence check and the write. */
  private static claimExitState(stateFile: string): boolean {
    try {
      writeFileSync(stateFile, 'exited', { 'flag': 'wx' });
      return true;
    } catch (cause) {
      if (cause instanceof Error && 'code' in cause && cause.code === 'EEXIST') {
        return false;
      }
      throw RuntimeError.create('Exit worker could not record its exit state.', { 'cause': cause });
    }
  }
}

ExitWorker.start();
