import { BaseError } from '@studnicky/types/browser';

/** Thrown when an entity cannot be structured-cloned into or out of the store. */
export class EntityStoreCloneError extends BaseError {
  public override readonly name: string = 'EntityStoreCloneError';

  public constructor(cause: unknown) {
    super({
      'cause': cause,
      'code': 'entityStore.cloneFailed',
      'message': 'The entity cannot be structured-cloned.',
      'retryable': false
    });
  }
}
