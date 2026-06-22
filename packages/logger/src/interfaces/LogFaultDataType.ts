/**
 * Log fault data structure.
 * Represents the complete error entry ready for output.
 */

import type { LogStatusType } from '../types/LogStatusType.js';

/**
 * Data structure for a normalized error log entry.
 * Root-level fields are indexed by CloudWatch for queries and tables.
 * The context field holds freeform application data as a JSON blob.
 */
export type LogFaultDataType = {
  readonly 'cause'?: string;
  readonly 'context': Record<string, unknown>;
  readonly 'durationMs'?: number;
  readonly 'event': string;
  readonly 'message': string;
  readonly 'name': string;
  readonly 'stack'?: string;
  readonly 'status': LogStatusType;
};
