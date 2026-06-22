import type { LogMetadataType } from '../types/LogMetadataType.js';

/**
 * Captured log entry from SpyLogger.
 *
 * Contains the log level, message, timestamp, and any metadata
 * that was attached to the logger or passed with the log call.
 */
export type CapturedLogEntryType = {
  readonly 'data'?: LogMetadataType;
  readonly 'level': string;
  readonly 'message': string;
  readonly 'timestamp': string;
};
