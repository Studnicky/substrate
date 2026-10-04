import { JsonError } from './JsonError.js';

/** Thrown when a value cannot be deep-cloned. */
export class CloneError extends JsonError {
  public override readonly name: string = 'CloneError';

  public constructor(cause: unknown) {
    super({
      'cause': cause,
      'code': 'json.cloneFailed',
      'message': 'The value cannot be cloned.',
      'retryable': false
    });
  }
}
