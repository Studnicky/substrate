import { BaseError } from '@studnicky/types/browser';

/** Thrown when the Context key a `ContextStore` resolves already holds a value that is not a Store owned by that `ContextStore`. */
export class ContextStoreKeyConflictError extends BaseError {
  public override readonly name: string = 'ContextStoreKeyConflictError';

  public readonly key: string;

  public constructor(key: string) {
    super({ 'code': 'store.contextKeyConflict', 'message': `ContextStore key ${key} does not contain a StoreInterface`, 'retryable': false });
    this.key = key;
  }
}
