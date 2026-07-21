import type { LogDataEntity } from '../entities/LogDataEntity.js';
import type { LogMetadataInterface } from './LogMetadataInterface.js';

/**
 * Logger interface with standard log levels
 *
 * This interface defines a pluggable logger that can be dependency-injected
 * into any module or service. Implementations can filter logs based on
 * configured log levels, output to different destinations, or remain silent.
 *
 * All log methods accept structured log data created with LogBody or LogFault.
 *
 * @example
 * ```typescript
 * import { LogBody, LogFault, LOG_STATUS } from '@studnicky/logger';
 *
 * class MyService {
 *   constructor(private logger: LoggerInterface) {}
 *
 *   async processData() {
 *     this.logger.debug(LogBody.create({
 *       component: 'service',
 *       context: { recordCount: 100 },
 *       message: 'Starting data processing',
 *       operation: 'process',
 *       status: LOG_STATUS.PENDING
 *     }));
 *   }
 *
 *   logFailure(error: Error) {
 *     this.logger.error(LogFault.create({
 *       cause: error.cause instanceof Error ? error.cause.message : undefined,
 *       component: 'service',
 *       context: { recordId: '123' },
 *       message: error.message,
 *       name: error.name,
 *       operation: 'process',
 *       stack: error.stack,
 *       status: LOG_STATUS.FAILED
 *     }));
 *   }
 * }
 * ```
 */
export interface LoggerInterface {
  /**
   * Create a child logger with additional metadata
   *
   * Child loggers inherit all metadata from their parent and merge it with
   * the provided metadata. All log messages from the child will include
   * both parent and child metadata.
   *
   * @param metadata - Additional metadata to include in all child log messages
   * @returns A new logger instance with merged metadata
   *
   * @example
   * ```typescript
   * const logger = Logger.create({ level: 'info' });
   * const requestLogger = logger.child({ requestId: '123', userId: 'abc' });
   * requestLogger.info(body); // record includes requestId and userId
   *
   * const operationLogger = requestLogger.child({ operation: 'upload' });
   * operationLogger.info(body); // record includes requestId, userId, and operation
   * ```
   */
  child(metadata: LogMetadataInterface): LoggerInterface;

  /**
   * Log debug messages (verbose)
   *
   * Use for detailed debugging information useful during development.
   * Typically disabled in production.
   *
   * @param data - Structured log data from LogBody.create()
   */
  debug(data: LogDataEntity.Type): void;

  /**
   * Log error messages
   *
   * Use for error events that should be investigated immediately.
   * Always logged in all environments.
   *
   * @param data - Structured log data from LogBody.create() or LogFault.create()
   */
  error(data: LogDataEntity.Type): void;

  /**
   * Log informational messages
   *
   * Use for general informational messages about application flow.
   * Safe for production use.
   *
   * @param data - Structured log data from LogBody.create()
   */
  info(data: LogDataEntity.Type): void;

  /**
   * Log trace messages (most verbose)
   *
   * Use for detailed flow tracing and diagnostic information.
   * Typically disabled in production.
   *
   * @param data - Structured log data from LogBody.create()
   */
  trace(data: LogDataEntity.Type): void;

  /**
   * Log warning messages
   *
   * Use for potentially harmful situations that should be investigated.
   * Always logged in all environments.
   *
   * @param data - Structured log data from LogBody.create() or LogFault.create()
   */
  warn(data: LogDataEntity.Type): void;
}
