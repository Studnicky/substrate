import { StoreError } from './StoreError.js';

/** Thrown when an IndexedDB state entry is not a serialized string. */
export class IndexedDbEntryError extends StoreError {
  public override readonly name: string = 'IndexedDbEntryError';

  public constructor() {
    super({ 'code': 'store.indexedDbInvalidEntry', 'message': 'IndexedDB state entries must be serialized strings', 'retryable': false });
  }
}
