import { BaseError } from '#runtime';

/** Thrown when a `ContextStore` factory returns a value that does not satisfy `StoreInterface`. */
export class ContextStoreFactoryError extends BaseError {
  public override readonly name: string = 'ContextStoreFactoryError';

  public constructor() {
    super({ 'code': 'store.contextFactoryInvalid', 'message': 'ContextStore factory must return a StoreInterface', 'retryable': false });
  }
}
