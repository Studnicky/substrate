import { RuntimeError } from '@studnicky/errors/node';

export class RejectingOperation {
  /** An operation that rejects with `message` on every call. */
  static of(message: string): () => Promise<never> {
    const operation = (): Promise<never> => {
      const failure = Promise.reject(RuntimeError.create(message));
      return failure;
    };
    return operation;
  }
}
