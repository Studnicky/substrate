/** Describes one validation failure from a schema check. */
export type ValidationViolationType = {
  /** Validation keyword that triggered the failure (e.g. `'required'`, `'minLength'`). */
  readonly 'keyword': string;
  /** Human-readable description of the failure. */
  readonly 'message': string;
  /** JSON Pointer or field name of the failing field (e.g. `'/user/email'`). */
  readonly 'path': string;
};
