import type { ValidationViolationType } from './ValidationViolationType.js';

/** RFC 7807 Problem Details payload for validation failure HTTP responses. */
export type ValidationProblemDetailsType = {
  readonly 'detail': string;
  readonly 'errors': readonly ValidationViolationType[];
  readonly 'status': number;
  readonly 'title': string;
  readonly 'type': string;
};
