import { IdempotencyGuardError } from './IdempotencyGuardError.js';

/**
 * Thrown when a payload cannot be fingerprinted: it is not an object, or its values are not
 * JSON-serializable (circular references, bigint). The originating platform error is the `cause`.
 */
export class IdempotencyPayloadError extends IdempotencyGuardError {
  public override readonly name: string = 'IdempotencyPayloadError';

  public constructor(message: string, cause: unknown) {
    super({ 'cause': cause, 'code': 'idempotencyGuard.unserializablePayload', 'message': message });
  }
}
