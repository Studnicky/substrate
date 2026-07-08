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
export const LOG_LEVEL_MAP: Record<'debug' | 'error' | 'info' | 'silent' | 'trace' | 'warn', (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL]> = {
  'debug': LOG_LEVEL.DEBUG,
  'error': LOG_LEVEL.ERROR,
  'info': LOG_LEVEL.INFO,
  'silent': LOG_LEVEL.SILENT,
  'trace': LOG_LEVEL.TRACE,
  'warn': LOG_LEVEL.WARN
} as const;
