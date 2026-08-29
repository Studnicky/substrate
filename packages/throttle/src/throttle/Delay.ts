import { RaceTimeout } from '@studnicky/signal';

import { ThrottleAbortedError } from '../errors/ThrottleAbortedError.js';

/** Isomorphic promisified delay using the global setTimeout, with optional AbortSignal support. */
export class Delay {
  static async for(ms: number, signal?: AbortSignal): Promise<void> {
    const result = await RaceTimeout.wait(ms, signal);

    if (result === 'aborted') {
      throw new ThrottleAbortedError('The operation was aborted', ms);
    }
  }
}
