import type { MemoryTransportOptionsEntity } from '../entities/MemoryTransportOptionsEntity.js';
import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';

/**
 * Runtime contract for MemoryTransport construction options.
 *
 * Extends the JSON Schema–derived `MemoryTransportOptionsEntity.Type` with a
 * tighter domain type for `level`, an explicit override of the schema-derived
 * widened form.
 */
export type MemoryTransportOptionsType = Omit<MemoryTransportOptionsEntity.Type, 'level'> & {
  'level'?: LogLevelStringType | LogLevelType;
};
