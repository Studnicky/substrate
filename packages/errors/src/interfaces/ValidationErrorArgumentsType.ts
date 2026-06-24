/**
 * Construction arguments for `ValidationError`.
 *
 * @module
 */
import type { ValidationViolationDetailType } from './ValidationViolationType.js';

/** Construction arguments for `ValidationError`. */
export type ValidationErrorArgumentsType = Pick<ValidationViolationDetailType, 'message' | 'path'> & {
  /** Optional correlation ID for distributed tracing. */
  readonly 'correlationId'?: string | undefined;
  /** Structured violation list (Ajv-style or custom). */
  readonly 'violations'?: readonly Readonly<ValidationViolationDetailType>[] | undefined;
};
