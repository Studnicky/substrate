import assert from 'node:assert/strict';

/** Fails the test run when any promise rejection goes unhandled while the guard is installed. */
export class UnhandledRejectionGuard {
  readonly #message: string;

  public constructor(message: string) {
    this.#message = message;
  }

  public install(): void {
    process.on('unhandledRejection', this.listener);
  }

  public uninstall(): void {
    process.off('unhandledRejection', this.listener);
  }

  private readonly listener = (): void => {
    assert.fail(this.#message);
  };
}
