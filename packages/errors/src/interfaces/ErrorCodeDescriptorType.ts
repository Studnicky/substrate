/**
 * Descriptor for a registered error code.
 *
 * @module
 */

/** Describes a registered error code entry in `ErrorCodeRegistry`. */
export type ErrorCodeDescriptorType = {
  /** Dotted camelCase error code (e.g. `'errors.validationFailed'`). */
  readonly 'code': string;
  /** Human-readable description of what this code represents. */
  readonly 'description': string;
  /** Whether errors with this code should be retried. */
  readonly 'retryable': boolean;
};
