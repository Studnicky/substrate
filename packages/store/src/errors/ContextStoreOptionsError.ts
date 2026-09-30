import { StoreError } from './StoreError.js';

/** Thrown when `ContextStore.create` receives options that do not satisfy the ContextStore contract. */
export class ContextStoreOptionsError extends StoreError {
  public override readonly name: string = 'ContextStoreOptionsError';

  public constructor(message: string) {
    super({ 'code': 'store.contextStoreInvalidOptions', 'message': message, 'retryable': false });
  }
}
