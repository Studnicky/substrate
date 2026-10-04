import { BaseError } from '@studnicky/types/browser';

/** Thrown when a `ContextStore` is used outside an active Context scope. */
export class ContextScopeInactiveError extends BaseError {
  public override readonly name: string = 'ContextScopeInactiveError';

  public constructor() {
    super({ 'code': 'store.contextScopeInactive', 'message': 'ContextStore requires an active Context scope', 'retryable': false });
  }
}
