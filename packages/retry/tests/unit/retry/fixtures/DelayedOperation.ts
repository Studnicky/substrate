import { setTimeout } from 'node:timers/promises';

export class DelayedOperation {
  /** An operation that resolves `value` after `delayMs`. */
  static of(delayMs: number, value: string): () => Promise<string> {
    const operation = async (): Promise<string> => {
      await setTimeout(delayMs);
      return value;
    };
    return operation;
  }
}
