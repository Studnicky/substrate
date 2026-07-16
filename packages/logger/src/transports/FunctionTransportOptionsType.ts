import type { FunctionTransportOptionsEntity } from '../entities/FunctionTransportOptionsEntity.js';
import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';

/**
 * Runtime contract for FunctionTransport construction options.
 *
 * Extends the JSON Schema–derived `FunctionTransportOptionsEntity.Type` with a
 * tighter domain type for `level`, an explicit override of the schema-derived
 * widened form.
 */
export type FunctionTransportOptionsType = Omit<FunctionTransportOptionsEntity.Type, 'level'> & {
  'level'?: LogLevelStringType | LogLevelType;
};
