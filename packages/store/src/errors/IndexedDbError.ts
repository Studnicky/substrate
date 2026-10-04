import { StoreError } from './StoreError.js';

/** Thrown when an IndexedDB open, transaction, or request fails; the platform error, when present, is the `cause`. */
export class IndexedDbError extends StoreError {
  public override readonly name: string = 'IndexedDbError';

  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'store.indexedDbFailed', 'message': message, 'retryable': false });
  }
}
