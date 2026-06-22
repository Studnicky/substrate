/** Overrides applied when generating an RFC 7807 Problem Details payload. */
export type ValidationReportOptionsType = {
  /** HTTP status code (defaults to `422`). */
  readonly 'status'?: number;
  /** Human-readable title (defaults to `'Validation failed'`). */
  readonly 'title'?: string;
  /** Problem type URI (defaults to `'https://problems.studnicky.dev/validation'`). */
  readonly 'type'?: string;
};
