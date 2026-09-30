import { StoreError } from './StoreError.js';

/** Thrown when Web Storage access or an operation on it fails; the platform error is the `cause`. */
export class BrowserStorageError extends StoreError {
  public override readonly name: string = 'BrowserStorageError';

  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'store.browserStorageFailed', 'message': message, 'retryable': false });
  }
}
