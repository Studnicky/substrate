import { IdempotencyGuardError } from './IdempotencyGuardError.js';

/** Thrown when `IdempotencyGuard` is constructed with invalid `{ capacity, ttlMs }` options. */
export class IdempotencyGuardConfigError extends IdempotencyGuardError {
  public override readonly name: string = 'IdempotencyGuardConfigError';

  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'idempotencyGuard.invalidConfig', 'message': message });
  }
}
