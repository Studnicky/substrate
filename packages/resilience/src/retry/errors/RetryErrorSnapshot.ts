import { BaseError } from '#runtime';

/**
 * Detached diagnostic copy of an arbitrary error captured during retrying.
 * Carries the original error's `name` and `message`; the original's own properties are copied onto it.
 * Code: `'retry.errorSnapshot'`.
 */
export class RetryErrorSnapshot extends BaseError {
  public override readonly name: string = 'RetryErrorSnapshot';

  public constructor(message: string, originalName: string) {
    super({
      'code': 'retry.errorSnapshot',
      'message': message,
      'retryable': false
    });
    this.name = originalName;
  }
}
