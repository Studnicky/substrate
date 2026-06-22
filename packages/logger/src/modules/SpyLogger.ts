import type { CapturedLogEntryType } from '../interfaces/CapturedLogEntryType.js';
import type { LoggerInterface } from '../interfaces/LoggerInterface.js';
import type { SpyLoggerInterface } from '../interfaces/SpyLoggerInterface.js';
import type { SpyStateType } from '../interfaces/SpyStateType.js';
import type { LogDataType } from '../types/LogDataType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';

/**
 * Logger wrapper that captures log entries for testing.
 *
 * Wraps any Logger implementation and captures all log calls to a buffer
 * while passing them through to the wrapped logger. Child loggers share
 * the same capture buffer.
 *
 * @example
 * ```typescript
 * // Wrap any logger
 * const spy = SpyLogger.wrap(PinoLogger.builder().level('silent').build());
 *
 * // Use normally - logs are captured
 * spy.info('Processing request', { requestId: '123' });
 *
 * // Check captured logs
 * const entries = spy.entries;
 * console.log(entries[0].message); // 'Processing request'
 *
 * // Flush for per-request capture
 * spy.clear();
 * await handleRequest();
 * const requestLogs = spy.flush();
 * ```
 *
 * @example
 * ```typescript
 * // Child loggers share the buffer
 * const spy = SpyLogger.wrap(noOpLogger);
 * const childLogger = spy.child({ service: 'auth' });
 *
 * childLogger.info('Login attempt');
 *
 * // Captured on parent
 * spy.entries[0].data?.service; // 'auth'
 * ```
 */
export class SpyLogger implements SpyLoggerInterface {
  /**
   * Wraps a logger to capture logs for testing.
   *
   * @param logger - The logger to wrap
   * @returns A new SpyLogger instance
   */
  static wrap(logger: LoggerInterface): SpyLogger {
    const result = new SpyLogger(logger, { 'buffer': [] }, {});
    return result;
  }

  protected readonly metadata: LogMetadataType;
  protected readonly state: SpyStateType;
  protected readonly wrapped: LoggerInterface;

  protected constructor(
    wrapped: LoggerInterface,
    state: SpyStateType,
    metadata: LogMetadataType
  ) {
    this.wrapped = wrapped;
    this.state = state;
    this.metadata = metadata;
  }

  /**
   * Creates a child logger with additional metadata.
   * Child loggers share the same capture buffer.
   *
   * @param childMetadata - Metadata to merge with parent metadata
   * @returns A new SpyLogger that captures to the same buffer
   */
  child(childMetadata: LogMetadataType): this {
    const wrappedChild = this.wrapped.child(childMetadata);
    const mergedMetadata = {
      ...this.metadata,
      ...childMetadata
    };

    return this.createChild(wrappedChild, mergedMetadata);
  }

  /**
   * Clears captured logs without returning them.
   * Use before a request to reset the buffer.
   */
  clear(): void {
    this.state.buffer.length = 0;
  }

  /**
   * Logs a debug message and captures it.
   *
   * @param data - Structured log data from LogBody.build()
   */
  debug(data: LogDataType): void {
    this.capture('debug', data);
    this.wrapped.debug(data);
  }

  /**
   * Captured log entries.
   * Returns a frozen snapshot of the current buffer.
   */
  get entries(): readonly CapturedLogEntryType[] {
    const result = Object.freeze([...this.state.buffer]);
    return result;
  }

  /**
   * Logs an error message and captures it.
   *
   * @param data - Structured log data from LogBody.build() or LogFault.build()
   */
  error(data: LogDataType): void {
    this.capture('error', data);
    this.wrapped.error(data);
  }

  /**
   * Gets and clears captured logs.
   * Use for per-request capture patterns.
   *
   * @returns Array of captured log entries
   */
  flush(): CapturedLogEntryType[] {
    const logs = [...this.state.buffer];

    this.state.buffer.length = 0;

    return logs;
  }

  /**
   * Logs an info message and captures it.
   *
   * @param data - Structured log data from LogBody.build()
   */
  info(data: LogDataType): void {
    this.capture('info', data);
    this.wrapped.info(data);
  }

  /**
   * Logs a trace message and captures it.
   *
   * @param data - Structured log data from LogBody.build()
   */
  trace(data: LogDataType): void {
    this.capture('trace', data);
    this.wrapped.trace(data);
  }

  /**
   * Logs a warning message and captures it.
   *
   * @param data - Structured log data from LogBody.build() or LogFault.build()
   */
  warn(data: LogDataType): void {
    this.capture('warn', data);
    this.wrapped.warn(data);
  }

  /**
   * Constructs a CapturedLogEntryType for the given level and data.
   * Subclasses override to enrich or transform the captured entry.
   */
  protected buildEntry(level: string, data: LogDataType): CapturedLogEntryType {
    const entryData: LogMetadataType = {
      ...this.metadata,
      ...data
    };

    return {
      'data': entryData,
      'level': level,
      'message': data.message,
      'timestamp': new Date().toISOString()
    };
  }

  protected capture(level: string, logData: LogDataType): void {
    const entry = this.buildEntry(level, logData);
    this.state.buffer.push(entry);
  }

  /**
   * Creates a child SpyLogger sharing the same state buffer.
   * Uses `this.constructor` so subclasses return their own type.
   */
  protected createChild(wrappedChild: LoggerInterface, mergedMetadata: LogMetadataType): this {
    return new (this.constructor as new (w: LoggerInterface, s: SpyStateType, m: LogMetadataType) => this)(
      wrappedChild,
      this.state,
      mergedMetadata
    );
  }
}
