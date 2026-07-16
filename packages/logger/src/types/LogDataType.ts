import type { LogBodyDataEntity } from '../entities/LogBodyDataEntity.js';
import type { LogFaultDataEntity } from '../entities/LogFaultDataEntity.js';

/**
 * Structured log data type accepted by logger methods.
 * Either a standard log body or a fault/error log entry.
 */
export type LogDataType = LogBodyDataEntity.Type | LogFaultDataEntity.Type;
