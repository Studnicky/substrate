import type { MessagePort } from 'node:worker_threads';

import { RuntimeError } from '@studnicky/errors/node';

export class WorkerReply {
  /** Posts `message` to the parent, surfacing a failed post as a named error. */
  static post(port: MessagePort, message: object): void {
    try {
      port.postMessage(message);
    } catch (cause) {
      throw RuntimeError.create('Worker reply could not be posted to the parent.', { 'cause': cause });
    }
  }
}
