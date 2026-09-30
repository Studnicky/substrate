import { StoreError } from './StoreError.js';

/** Thrown when `StrataStore.create` receives layers or a mutex identity that violate the composition contract. */
export class StrataStoreOptionsError extends StoreError {
  public override readonly name: string = 'StrataStoreOptionsError';

  public constructor(message: string) {
    super({ 'code': 'store.strataInvalidOptions', 'message': message, 'retryable': false });
  }
}
