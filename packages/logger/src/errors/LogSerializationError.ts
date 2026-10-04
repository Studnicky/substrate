import { LoggerError } from './LoggerError.js';

/**
 * Error thrown when a value cannot be serialized to JSON for log output.
 *
 * Thrown by `SafeStringify.stringify` when the platform serializer rejects a value
 * (for example a `BigInt`, or a `toJSON` that throws); the platform error is the `cause`.
 */
export class LogSerializationError<TCause = unknown> extends LoggerError<TCause> {
  public override readonly name: string = 'LogSerializationError';

  /**
   * Creates a new LogSerializationError
   *
   * @param message - Descriptive error message
   * @param cause - The platform serialization error
   */
  constructor(message: string, cause?: TCause) {
    super(message, cause);
  }
}
