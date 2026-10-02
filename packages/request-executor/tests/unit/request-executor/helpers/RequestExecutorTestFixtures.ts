import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

/** Shared platform fixtures and assertions for request-executor unit scenarios. */
export class RequestExecutorTestFixtures {
  static readonly originalFetch = globalThis.fetch;

  static assertErrorMessageIncludes(error: Error, expectedMessage: string): void {
    assert.equal(error.message.includes(expectedMessage), true);
  }

  static restoreFetch(): void {
    globalThis.fetch = RequestExecutorTestFixtures.originalFetch;
  }

  static async captureRejectedError(promise: Promise<Response>): Promise<Error> {
    try {
      await promise;
    } catch (error) {
      assert.ok(error instanceof Error);
      return error;
    }

    throw RuntimeError.create('Expected promise to reject');
  }

  static setFetch(handler: typeof fetch): void {
    globalThis.fetch = handler;
  }
}
