import { StoreError } from './StoreError.js';

/** Thrown when a Store mutation is requested from inside a Store listener. */
export class StoreListenerMutationError extends StoreError {
  public override readonly name: string = 'StoreListenerMutationError';

  public constructor() {
    super({ 'code': 'store.mutationFromListener', 'message': 'Store mutations are not allowed from a Store listener', 'retryable': false });
  }
}
