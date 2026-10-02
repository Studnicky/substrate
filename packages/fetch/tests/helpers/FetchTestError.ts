import { BaseError } from '@studnicky/types/node';

/** An error a test fixture raises on purpose, or rethrows when a platform call fails. */
export class FetchTestError extends BaseError {
  public override readonly name: string = 'FetchTestError';

  constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'fetch.test.fixtureFailure', 'message': message });
  }
}
