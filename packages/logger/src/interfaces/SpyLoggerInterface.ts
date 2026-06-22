import type { CapturedLogEntryType } from './CapturedLogEntryType.js';
import type { LoggerInterface } from './LoggerInterface.js';

/**
 * Interface for SpyLogger, extending LoggerInterface with capture controls.
 */
export interface SpyLoggerInterface extends LoggerInterface {
  /**
   * Clears captured logs without returning them.
   * Use before a request to reset the buffer.
   */
  clear(): void;

  /**
   * Captured log entries.
   */
  readonly 'entries': readonly CapturedLogEntryType[];

  /**
   * Gets and clears captured logs.
   * Use for per-request capture patterns.
   *
   * @returns Array of captured log entries
   */
  flush(): CapturedLogEntryType[];
}
