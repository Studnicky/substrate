import type { ConsoleTransportOptionsEntity } from '../entities/ConsoleTransportOptionsEntity.js';
import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';

/**
 * Runtime contract for ConsoleTransport construction options.
 *
 * Extends the JSON Schema–derived `ConsoleTransportOptionsEntity.Type` with a
 * tighter domain type for `level`, an explicit override of the schema-derived
 * widened form.
 */
export type ConsoleTransportOptionsType = Omit<ConsoleTransportOptionsEntity.Type, 'level'> & {
  'level'?: LogLevelStringType | LogLevelType;
};
