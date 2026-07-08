import type { LOG_LEVEL } from '../constants/LOG_LEVEL.js';

/**
 * Log level numeric value type.
 *
 * Valid values: 0 (TRACE) through 5 (SILENT)
 */
export type LogLevelType = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];
