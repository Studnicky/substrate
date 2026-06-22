/**
 * Log body data structure.
 * Represents the complete log entry ready for output.
 */

import type { LogStatusType } from '../types/LogStatusType.js';

/**
 * Data structure for a normalized log entry.
 * Root-level fields are indexed by CloudWatch for queries and tables.
 * The context field holds freeform application data as a JSON blob.
 */
export type LogBodyDataType = {
  readonly 'context': Record<string, unknown>;
  readonly 'durationMs'?: number;
  readonly 'event': string;
  readonly 'message': string;
  readonly 'status': LogStatusType;
};
