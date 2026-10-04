import { BaseError } from '@studnicky/types/node';

/** A fixture failure raised by test doubles; carries an optional platform error as its cause. */
export class StoreTestError extends BaseError {
  public override readonly name: string = 'StoreTestError';

  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'test.storeFixtureFailed', 'message': message });
  }
}
