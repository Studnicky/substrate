import { StoreError } from './StoreError.js';

/** Thrown when a serialized state string is not parseable JSON; the platform parse error is the `cause`. */
export class StateDecodeError extends StoreError {
  public override readonly name: string = 'StateDecodeError';

  public constructor(cause: unknown) {
    super({ 'cause': cause, 'code': 'store.stateDecodeFailed', 'message': 'The serialized state is not valid JSON.', 'retryable': false });
  }
}
