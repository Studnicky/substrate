import type { LogLevelEntity } from '../entities/LogLevelEntity.js';
import type { LogLevelNameEntity } from '../entities/LogLevelNameEntity.js';

import { LOG_LEVEL } from './LOG_LEVEL.js';

/**
 * Mapping from string log level names to LOG_LEVEL values
 *
 * Provides constant-time lookup for converting string representations
 * to their corresponding numeric LOG_LEVEL values.
 *
 * @example
 * ```typescript
 * const level = LOG_LEVEL_MAP['info']; // LOG_LEVEL.INFO (2)
 * const debugLevel = LOG_LEVEL_MAP['debug']; // LOG_LEVEL.DEBUG (1)
 * ```
 */
export const LOG_LEVEL_MAP: Record<LogLevelNameEntity.Type, LogLevelEntity.Type> = {
  'debug': LOG_LEVEL.DEBUG,
  'error': LOG_LEVEL.ERROR,
  'info': LOG_LEVEL.INFO,
  'silent': LOG_LEVEL.SILENT,
  'trace': LOG_LEVEL.TRACE,
  'warn': LOG_LEVEL.WARN
} as const;
