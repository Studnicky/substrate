import { StoreError } from './StoreError.js';

/** Thrown when a `StrataStore` cannot resolve one of its layers. */
export class StrataLayerUnavailableError extends StoreError {
  public override readonly name: string = 'StrataLayerUnavailableError';

  public constructor(message: string) {
    super({ 'code': 'store.strataLayerUnavailable', 'message': message, 'retryable': false });
  }
}
