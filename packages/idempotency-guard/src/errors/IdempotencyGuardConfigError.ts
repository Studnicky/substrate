import { IdempotencyGuardError } from './IdempotencyGuardError.js';

/** Thrown when `IdempotencyGuard` is constructed with invalid `{ capacity, ttlMs }` options. */
export class IdempotencyGuardConfigError extends IdempotencyGuardError {
  public constructor(message: string) {
    super({ 'code': 'idempotencyGuard.invalidConfig', 'message': message });
  }
}
