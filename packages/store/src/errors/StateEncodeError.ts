import { StoreError } from './StoreError.js';

/** Thrown when a state cannot be serialized to a JSON string; a platform serialization error, when present, is the `cause`. */
export class StateEncodeError extends StoreError {
  public override readonly name: string = 'StateEncodeError';

  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'store.stateEncodeFailed', 'message': message, 'retryable': false });
  }
}
