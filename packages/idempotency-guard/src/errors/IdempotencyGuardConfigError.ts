import { IdempotencyGuardError } from './IdempotencyGuardError.js';

/** Thrown when `IdempotencyGuardBuilder#build()` is called with missing required configuration. */
export class IdempotencyGuardConfigError extends IdempotencyGuardError {
  public constructor(message: string) {
    super({ 'code': 'idempotencyGuard.invalidConfig', 'message': message });
  }
}
