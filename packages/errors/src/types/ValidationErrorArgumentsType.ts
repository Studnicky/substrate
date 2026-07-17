/**
 * Construction arguments for `ValidationError`.
 *
 * @module
 */
import type { ValidationViolationDetailEntity } from '../entities/ValidationViolationDetailEntity.js';

/** Construction arguments for `ValidationError`. */
export type ValidationErrorArgumentsType = Pick<ValidationViolationDetailEntity.Type, 'message' | 'path'> & {
  /** Optional correlation ID for distributed tracing. */
  'correlationId'?: string | undefined;
  /** Structured violation list (Ajv-style or custom). */
  'violations'?: Readonly<ValidationViolationDetailEntity.Type>[] | undefined;
};
