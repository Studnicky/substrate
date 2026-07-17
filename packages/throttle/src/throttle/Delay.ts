import { RaceTimeout } from '@studnicky/signal';

/** Isomorphic promisified delay using the global setTimeout, with optional AbortSignal support. */
export class Delay {
  static async for(ms: number, signal?: AbortSignal): Promise<void> {
    const result = await RaceTimeout.wait(ms, signal);

    if (result === 'aborted') {
      throw new DOMException('The operation was aborted', 'AbortError');
    }
  }
}
