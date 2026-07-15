import type { LogBodyDataType } from './LogBodyDataType.js';
import type { LogFaultDataType } from './LogFaultDataType.js';

/**
 * Structured log data type accepted by logger methods.
 * Either a standard log body or a fault/error log entry.
 */
export type LogDataType = LogBodyDataType | LogFaultDataType;
