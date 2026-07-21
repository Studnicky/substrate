/**
 * Thrown when input validation fails against a declared schema.
 *
 * @module
 */
import type { JSONSchema7Type } from 'json-schema';

import type { ValidationErrorArgumentsEntity } from '../entities/ValidationErrorArgumentsEntity.js';
import type { ValidationViolationDetailEntity } from '../entities/ValidationViolationDetailEntity.js';

import { DefensiveSnapshot } from '../validation/DefensiveSnapshot.js';
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
  public static create(args: Readonly<ValidationErrorArgumentsEntity.Type>): ValidationError {
    const result = new ValidationError(args);
    return result;
  }

  readonly #violations: readonly Readonly<ValidationViolationDetailEntity.Type>[] | undefined;

  /** Detached structured validation violations. */
  public get violations(): readonly Readonly<ValidationViolationDetailEntity.Type>[] | undefined {
    if (this.#violations === undefined) {
      return undefined;
    }

    const result: ValidationViolationDetailEntity.Type[] = [];
    for (const violation of this.#violations) {
      const snapshot: ValidationViolationDetailEntity.Type = {
        'message': violation.message,
        'path': violation.path
      };
      if (violation.details !== undefined) {
        snapshot.details = DefensiveSnapshot.record(violation.details);
      }
      result.push(snapshot);
    }
    return result;
  }

  protected constructor(args: Readonly<ValidationErrorArgumentsEntity.Type>) {
    const metadata: Record<string, JSONSchema7Type> = { 'path': args.path };
    // Violations remain a dedicated field rather than error metadata.
    super({
      'code': 'errors.validationFailed',
      'correlationId': args.correlationId,
      'message': ValidationError.buildMessage(args.path, args.message),
      'metadata': metadata,
      'retryable': false
    });
    let violations: ValidationViolationDetailEntity.Type[] | undefined;
    if (args.violations !== undefined) {
      violations = [];
      for (const violation of args.violations) {
        const snapshot: ValidationViolationDetailEntity.Type = {
          'message': violation.message,
          'path': violation.path
        };
        if (violation.details !== undefined) {
          snapshot.details = DefensiveSnapshot.record(violation.details);
        }
        violations.push(snapshot);
      }
    }
    this.#violations = violations;
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
    if (this.#violations !== undefined) {
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
    if (this.#violations !== undefined && this.#violations.length > 0) {
      const lines = this.#violations.map((v) => { const result = `  - ${v.path}: ${v.message}`; return result; });
      return `${this.message}\n${lines.join('\n')}`;
    }
    return this.message;
  }

  public override toUserMessage(): string {
    const result = this.formatUserMessage();
    return result;
  }
}
