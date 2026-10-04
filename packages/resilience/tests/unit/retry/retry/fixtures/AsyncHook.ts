import { RuntimeError } from '@studnicky/errors/node';
import { setTimeout } from 'node:timers/promises';

export class AsyncHook {
  /** A hook that resolves after `delayMs`. */
  static delayed(delayMs: number): () => Promise<void> {
    const hook = async (): Promise<void> => {
      await setTimeout(delayMs);
    };
    return hook;
  }

  /** A hook whose promise never settles. */
  static hanging(): Promise<void> {
    return new Promise<void>(() => {});
  }

  /** A hook that rejects with `message` after one microtask. */
  static rejecting(message: string): () => Promise<void> {
    const hook = async (): Promise<void> => {
      await Promise.resolve();
      throw RuntimeError.create(message);
    };
    return hook;
  }
}
