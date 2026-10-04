import { JsonError } from './JsonError.js';

/** Thrown when a derived value does not share the structural kind of its source value. */
export class SameKindError extends JsonError {
  public override readonly name: string = 'SameKindError';

  public constructor(message: string) {
    super({ 'code': 'json.kindMismatch', 'message': message, 'retryable': false });
  }
}
