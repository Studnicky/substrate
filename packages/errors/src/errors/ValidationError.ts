/**
 * Thrown when input validation fails against a declared schema.
 *
 * @module
 */
import type { JsonValueType } from '@studnicky/types';

import type { ValidationErrorArgumentsType } from '../types/ValidationErrorArgumentsType.js';
import type { ValidationViolationDetailType } from '../types/ValidationViolationDetailType.js';

import { BaseError } from './BaseError.js';
import { ErrorCodeRegistry } from './ErrorCodeRegistry.js';

// Register the error code at module load.
ErrorCodeRegistry.register({
  'code': 'errors.validationFailed',
  'description': 'Input validation failed against the declared schema.',
  'retryable': false
});

/**
 * Thrown when schema/type validation fails on a public API boundary.
 * Code: `'errors.validationFailed'`.
 *
 * Use `ValidationError.create()` as the ergonomic construction path.
 * Subclasses may call the protected constructor directly from their own
 * `create()` factory.
 */
export class ValidationError extends BaseError {
  /**
   * Creates a new `ValidationError`.
   */
  public static create(args: Readonly<ValidationErrorArgumentsType>): ValidationError {
    const result = new ValidationError(args);
    return result;
  }

  /** Structured list of validation violations. */
  public readonly violations: readonly Readonly<ValidationViolationDetailType>[] | undefined;

  protected constructor(args: Readonly<ValidationErrorArgumentsType>) {
    const metadata: Record<string, JsonValueType> = { 'path': args.path };
    // Don't try to serialize violations into JsonValueType — store them separately.
    super({
      'code': 'errors.validationFailed',
      'correlationId': args.correlationId,
      'message': ValidationError.buildMessage(args.path, args.message),
      'metadata': metadata,
      'retryable': false
    });
    this.violations = args.violations;
  }

  /**
   * Builds the formatted error message from path and summary.
   * Subclasses may override to customize the message template; they must pass
   * the result as the `message` to `super()` in their own constructor.
   *
   * Fire-point: called as a static helper from the constructor initializer.
   */
  protected static buildMessage(path: string, summary: string): string {
    const result = `Validation failed at "${path}": ${summary}`;
    return result;
  }

  /**
   * Returns extra serialized fields for `toJSON()`.
   * Includes `violations` when defined.
   *
   * Fire-point: called from `toJSON()` via the base `serializeExtra()` hook.
   */
  protected override serializeExtra(): Record<string, unknown> {
    if (this.violations !== undefined) {
      return { 'violations': this.violations };
    }
    return {};
  }

  /**
   * Formats the user-facing message.
   * Includes violation details when present.
   *
   * Fire-point: called from `toUserMessage()`.
   */
  protected override formatUserMessage(): string {
    if (this.violations !== undefined && this.violations.length > 0) {
      const lines = this.violations.map((v) => { const result = `  - ${v.path}: ${v.message}`; return result; });
      return `${this.message}\n${lines.join('\n')}`;
    }
    return this.message;
  }

  public override toUserMessage(): string {
    const result = this.formatUserMessage();
    return result;
  }
}
