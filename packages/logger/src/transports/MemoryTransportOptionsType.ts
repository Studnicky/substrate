import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';

/**
 * Configuration options for MemoryTransport.
 */
export type MemoryTransportOptionsType = {
  /**
   * Minimum log level this transport accepts. Records below this level
   * are silently ignored. Defaults to the Logger global floor (TRACE).
   */
  readonly 'level'?: LogLevelStringType | LogLevelType;
};
