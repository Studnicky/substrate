import { BaseError } from '@studnicky/types/browser';

/** Thrown when a page or cursor cannot be structured-cloned. */
export class PaginatorCloneError extends BaseError {
  public override readonly name: string = 'PaginatorCloneError';

  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'paginator.cloneFailed', 'message': message, 'retryable': false });
  }
}
