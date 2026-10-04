import assert from 'node:assert/strict';

/** Captures the error a callback throws or a promise rejects with, so a test can assert on the caught value. */
export class ErrorCapture {
  static async rejection(promise: Promise<unknown>): Promise<Error> {
    let captured: Error | undefined;
    try {
      await promise;
    } catch (error) {
      assert.ok(error instanceof Error);
      captured = error;
    }
    assert.ok(captured !== undefined, 'Expected promise to reject');
    return captured;
  }

  static async rejectionMessage(promise: Promise<unknown>, fragment: string): Promise<void> {
    const error = await ErrorCapture.rejection(promise);
    assert.ok(
      error.message.includes(fragment),
      `Expected "${error.message}" to include "${fragment}"`
    );
  }

  static thrown(callback: () => void): Error {
    let captured: Error | undefined;
    try {
      callback();
    } catch (error) {
      assert.ok(error instanceof Error);
      captured = error;
    }
    assert.ok(captured !== undefined, 'Expected callback to throw');
    return captured;
  }

  static thrownMessage(callback: () => void, fragment: string): void {
    const error = ErrorCapture.thrown(callback);
    assert.ok(
      error.message.includes(fragment),
      `Expected "${error.message}" to include "${fragment}"`
    );
  }
}
