import { StoreError } from './StoreError.js';

/** Thrown when IndexedDB persistence is selected in a runtime without IndexedDB. */
export class IndexedDbUnavailableError extends StoreError {
  public override readonly name: string = 'IndexedDbUnavailableError';

  public constructor() {
    super({ 'code': 'store.indexedDbUnavailable', 'message': 'IndexedDB is unavailable in this runtime', 'retryable': false });
  }
}
