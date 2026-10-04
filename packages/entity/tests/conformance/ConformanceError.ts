import { BaseError } from '@studnicky/types/node';

/**
 * Thrown when the conformance harness cannot read, parse, or write one of its files.
 * Code: `'entity.conformanceFile'`.
 */
export class ConformanceError extends BaseError {
  public override readonly name: string = 'ConformanceError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'entity.conformanceFile',
      'message': message,
      'retryable': false
    });
  }
}
