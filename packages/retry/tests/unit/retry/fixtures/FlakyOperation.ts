import { RuntimeError } from '@studnicky/errors/node';

import type { Retry } from '../../../../src/retry/index.js';

export class FlakyOperation {
  attempts = 0;

  /** Rejects for the first `failureCountBeforeSuccess` attempts, then resolves `result`. */
  readonly run = (): Promise<string> => {
    this.attempts += 1;
    let outcome = Promise.resolve(this.#result);
    if (this.attempts <= this.#failureCountBeforeSuccess) {
      outcome = Promise.reject(RuntimeError.create(this.#errorMessage));
    }
    return outcome;
  };

  readonly #errorMessage: string;

  readonly #failureCountBeforeSuccess: number;

  readonly #result: string;

  constructor(failureCountBeforeSuccess: number, errorMessage: string, result: string) {
    this.#failureCountBeforeSuccess = failureCountBeforeSuccess;
    this.#errorMessage = errorMessage;
    this.#result = result;
  }

  /** Runs a fresh flaky operation through `retry` and reports the attempt count with the settled result. */
  static async execute(retry: Retry, failureCountBeforeSuccess: number, errorMessage: string, result: string): Promise<{ 'attempts': number; 'result': string }> {
    const operation = new FlakyOperation(failureCountBeforeSuccess, errorMessage, result);
    const settled = await retry.execute(operation.run);
    return { 'attempts': operation.attempts, 'result': settled };
  }
}
