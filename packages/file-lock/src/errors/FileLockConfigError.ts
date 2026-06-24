import { FileLockError } from './FileLockError.js';

/**
 * Thrown when a `FileLock` is constructed or acquired with invalid option values.
 */
export class FileLockConfigError extends FileLockError {
  constructor(message: string) {
    super({ 'code': 'fileLock.invalidConfig', 'message': message, 'retryable': false });
  }
}
