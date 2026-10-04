import { BaseError } from '@studnicky/types/node';

/** Raised when an operation a test expects to fail completes instead. */
export class NoRejectionError extends BaseError {
  public override readonly name: string = 'NoRejectionError';

  constructor() {
    super({ 'code': 'fetch.test.noRejection', 'message': 'the operation completed without failing' });
  }
}
