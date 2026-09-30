import { StoreError } from './StoreError.js';

/** Thrown when a backing Store reports a synchronization identity that differs from the `ContextStore` configuration. */
export class SynchronizationIdentityMismatchError extends StoreError {
  public override readonly name: string = 'SynchronizationIdentityMismatchError';

  public constructor() {
    super({ 'code': 'store.synchronizationIdentityMismatch', 'message': 'ContextStore backing Store synchronization identity must match its configured synchronizationIdentity', 'retryable': false });
  }
}
