import { NoRejectionError } from './NoRejectionError.js';

/**
 * Captures what an operation throws as a value the test narrows with `instanceof`. An operation that
 * completes fails the test with a `NoRejectionError`, the way a missing rejection fails `assert.rejects`.
 */
export class RejectionProbe {
  static async capture(operation: () => Promise<unknown>): Promise<unknown> {
    let completed = false;
    let captured: unknown;
    try {
      await operation();
      completed = true;
    } catch (error) {
      captured = error;
    }
    if (completed) {
      throw new NoRejectionError();
    }
    return captured;
  }

  static captureSync(operation: () => unknown): unknown {
    let completed = false;
    let captured: unknown;
    try {
      operation();
      completed = true;
    } catch (error) {
      captured = error;
    }
    if (completed) {
      throw new NoRejectionError();
    }
    return captured;
  }
}
