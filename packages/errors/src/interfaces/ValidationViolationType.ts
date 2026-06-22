/**
 * A single validation violation, carrying path, message, and optional details.
 *
 * @module
 */
import type { JsonValueType } from '@studnicky/types';

/** Describes one validation failure from a schema check, with optional structured details. */
export type ValidationViolationDetailType = {
  /** Additional structured details about the violation. */
  readonly 'details'?: Readonly<Record<string, JsonValueType>>;
  /** Human-readable description of the failure. */
  readonly 'message': string;
  /** JSON Pointer or dot-path to the failing field (e.g. `'/user/email'`). */
  readonly 'path': string;
};
