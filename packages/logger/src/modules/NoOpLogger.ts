import type { LoggerInterface } from '../interfaces/LoggerInterface.js';

/**
 * No-operation logger that discards all log messages
 *
 * Useful for:
 * - Testing when you don't want log output
 * - Production environments where logging is disabled
 * - Libraries that want a default silent logger
 *
 * @example
 * ```typescript
 * const logger = NoOpLogger.create();
 *
 * // All log calls are ignored
 * logger.info('This will not be logged');
 * logger.error('This will also be ignored');
 * ```
 */
export class NoOpLogger implements LoggerInterface {
  /**
   * Creates a new NoOpLogger instance.
   *
   * @returns A new NoOpLogger instance
   *
   * @example
   * ```typescript
   * import { NoOpLogger } from '@studnicky/logger';
   *
   * const logger = NoOpLogger.create();
   * logger.info('This message is discarded');
   * ```
   */
  static create(): NoOpLogger {
    const result = new NoOpLogger();
    return result;
  }

  /**
   * Protected constructor. Use NoOpLogger.create() to instantiate.
   */
  protected constructor() {}

  // LoggerInterface methods — no-op implementations discard all arguments
  child(): LoggerInterface { return this; }
  debug(): void {}
  error(): void {}
  info(): void {}
  trace(): void {}
  warn(): void {}
}
