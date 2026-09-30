import { BaseError } from './BaseError.js';

/**
 * Thrown when a candidate contains a value outside the runtime operand contract.
 * Code: `'types.runtimeValueInvalid'`.
 */
export class RuntimeValueError extends BaseError {
  public override readonly name: string = 'RuntimeValueError';

  public constructor(message: string) {
    super({
      'code': 'types.runtimeValueInvalid',
      'message': message,
      'retryable': false
    });
  }
}
