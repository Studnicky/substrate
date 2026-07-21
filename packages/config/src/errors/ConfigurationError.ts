import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors';

/**
 * Configuration validation error. Extends `BaseError` so consumers get
 * `code`, `retryable`, `toJSON()`, and cause-chain helpers out of the box.
 *
 * Use `ConfigurationError.create(message)` to construct an instance.
 */
export class ConfigurationError extends BaseError {
  /** Fixed error code for all configuration validation failures. */
  public static readonly errorCode = 'config.invalid';

  /**
   * Factory — preferred construction path.
   * @param message - Human-readable description of the validation failure.
   * @param cause   - Optional underlying cause.
   */
  public static create(message: string, cause?: unknown): ConfigurationError {
    const result = new ConfigurationError({ 'cause': cause, 'code': ConfigurationError.errorCode, 'message': message, 'retryable': false });
    return result;
  }

  protected constructor(args: Readonly<BaseErrorArgumentsInterface>) {
    super(args);
  }
}
