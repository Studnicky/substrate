import { StoreError } from './StoreError.js';

/** Thrown when the Context key a `ContextStore` resolves already holds a value that is not a Store owned by that `ContextStore`. */
export class ContextStoreKeyConflictError extends StoreError {
  public override readonly name: string = 'ContextStoreKeyConflictError';

  public readonly key: string;

  public constructor(key: string) {
    super({ 'code': 'store.contextKeyConflict', 'message': `ContextStore key ${key} does not contain a StoreInterface`, 'retryable': false });
    this.key = key;
  }
}
