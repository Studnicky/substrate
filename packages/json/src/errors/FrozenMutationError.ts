import { JsonError } from './JsonError.js';

/** Thrown when a mutation is attempted on a frozen Map or Set. */
export class FrozenMutationError extends JsonError {
  public readonly method: string;

  public constructor(message: string, method: string) {
    super({ 'code': 'json.frozenMutation', 'message': message, 'retryable': false });
    this.method = method;
  }
}
