import { StoreError } from './StoreError.js';

/** Thrown when a `ContextStore` is used outside an active Context scope. */
export class ContextScopeInactiveError extends StoreError {
  public override readonly name: string = 'ContextScopeInactiveError';

  public constructor() {
    super({ 'code': 'store.contextScopeInactive', 'message': 'ContextStore requires an active Context scope', 'retryable': false });
  }
}
