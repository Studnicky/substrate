import type { ConsoleLoggerConfigType } from '../interfaces/ConsoleLoggerConfigType.js';
import type { LoggerInterface } from '../interfaces/LoggerInterface.js';
import type { LogDataType } from '../types/LogDataType.js';
import type { LogLevelType } from '../types/LogLevelType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';

import { LogLevel } from '../constants/LogLevel.js';
import { configValidation } from './configValidation.js';
import { ConsoleLoggerBuilder } from './ConsoleLoggerBuilder.js';
import { parseLogLevel } from './parseLogLevel.js';
import { safeStringify } from './safeStringify.js';

/**
 * Dispatch map from LogLevelType to the corresponding console method.
 * SILENT has no console method — it is handled by shouldLog() returning false.
 */
const consoleDispatch: Record<number, (message: string, data: LogDataType) => void> = {};
consoleDispatch[LogLevel.DEBUG] = (msg, data) => { console.debug(msg, data); };
consoleDispatch[LogLevel.ERROR] = (msg, data) => { console.error(msg, data); };
consoleDispatch[LogLevel.INFO]  = (msg, data) => { console.info(msg, data); };
consoleDispatch[LogLevel.TRACE] = (msg, data) => { console.trace(msg, data); };
consoleDispatch[LogLevel.WARN]  = (msg, data) => { console.warn(msg, data); };

/**
 * Console-based logger implementation with configurable log level filtering
 *
 * @example
 * ```typescript
 * const logger = new ConsoleLogger({ level: LogLevel.DEBUG });
 * const logger = ConsoleLogger.create({ level: 'debug', prefix: '[App]' });
 * ```
 */
export class ConsoleLogger implements LoggerInterface {
  /**
   * Creates a builder for fluent ConsoleLogger configuration.
   *
   * @returns A new ConsoleLoggerBuilder instance
   *
   * @example
   * ```typescript
   * const logger = ConsoleLogger.builder()
   *   .level('debug')
   *   .includeTimestamp(true)
   *   .prefix('[App]')
   *   .build();
   * ```
   */
  static builder(): ConsoleLoggerBuilder<ConsoleLogger> {
    const result = ConsoleLoggerBuilder.create((config) => {
      const result = new ConsoleLogger(config);
      return result;
    });
    return result;
  }
  /**
   * Creates a new ConsoleLogger instance with the specified configuration
   *
   * @param config - Configuration options for the logger
   * @returns A new ConsoleLogger instance
   *
   * @example
   * ```typescript
   * const logger = ConsoleLogger.create({ level: 'info', prefix: '[App]' });
   * logger.info('Application started');
   * ```
   */
  static create(config: ConsoleLoggerConfigType = {}): ConsoleLogger {
    const result = new ConsoleLogger(config);
    return result;
  }

  protected cachedMetadataString: string | undefined;
  protected readonly hasMetadata: boolean;
  protected readonly includeTimestamp: boolean;
  protected readonly metadata: LogMetadataType;
  protected readonly minLevel: LogLevelType;
  protected readonly prefix: string;

  constructor(config: ConsoleLoggerConfigType = {}) {
    configValidation.assertString(config.prefix, 'prefix');
    configValidation.assertBoolean(config.includeTimestamp, 'includeTimestamp');
    configValidation.assertPlainObject(config.metadata, 'metadata');

    this.minLevel = parseLogLevel(config.level ?? LogLevel.INFO);
    this.prefix = config.prefix ?? '';
    this.includeTimestamp = config.includeTimestamp ?? false;
    this.metadata = config.metadata ?? {};
    this.hasMetadata = Object.keys(this.metadata).length > 0;
  }

  /**
   * Creates a child logger with additional metadata
   *
   * Child loggers inherit all settings from their parent and merge the
   * provided metadata. All log messages from the child include both
   * parent and child metadata.
   *
   * @param metadata - Additional metadata to include in all child log messages
   * @returns A new instance of the same class with merged metadata
   *
   * @example
   * ```typescript
   * const logger = ConsoleLogger.create({ level: 'info' });
   * const requestLogger = logger.child({ requestId: '123' });
   * requestLogger.info('Processing'); // Includes requestId in metadata
   * ```
   */
  child(metadata: LogMetadataType): this {
    const mergedMetadata = { ...this.metadata, ...metadata };
    let hasMetadata = this.hasMetadata;

    if (!hasMetadata) {
      hasMetadata = Object.keys(mergedMetadata).length > 0;
    }

    return this.createChild(mergedMetadata);
  }

  /**
   * Logs a debug message (verbose)
   *
   * Use for detailed debugging information useful during development.
   * Typically disabled in production.
   *
   * @param data - Structured log data from LogBody.build()
   */
  debug(data: LogDataType): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.emit(LogLevel.DEBUG, this.formatMessage(data.message), data);
    }
  }

  /**
   * Logs an error message
   *
   * Use for error events that should be investigated immediately.
   * Always logged in all environments.
   *
   * @param data - Structured log data from LogBody.build() or LogFault.build()
   */
  error(data: LogDataType): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.emit(LogLevel.ERROR, this.formatMessage(data.message), data);
    }
  }

  /**
   * Logs an informational message
   *
   * Use for general informational messages about application flow.
   * Safe for production use.
   *
   * @param data - Structured log data from LogBody.build()
   */
  info(data: LogDataType): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.emit(LogLevel.INFO, this.formatMessage(data.message), data);
    }
  }

  /**
   * Logs a trace message (most verbose)
   *
   * Use for detailed flow tracing and diagnostic information.
   * Typically disabled in production.
   *
   * @param data - Structured log data from LogBody.build()
   */
  trace(data: LogDataType): void {
    if (this.shouldLog(LogLevel.TRACE)) {
      this.emit(LogLevel.TRACE, this.formatMessage(data.message), data);
    }
  }

  /**
   * Logs a warning message
   *
   * Use for potentially harmful situations that should be investigated.
   * Always logged in all environments.
   *
   * @param data - Structured log data from LogBody.build() or LogFault.build()
   */
  warn(data: LogDataType): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.emit(LogLevel.WARN, this.formatMessage(data.message), data);
    }
  }

  /**
   * Creates a child logger instance with the given merged metadata.
   * Subclasses override this to return the correct prototype chain.
   * Uses `this.constructor.prototype` so subclasses get their own prototype.
   *
   * After setting up the base ConsoleLogger properties, calls `initChild(child)`
   * so that subclasses can initialize their own instance fields on the child.
   */
  protected createChild(mergedMetadata: LogMetadataType): this {
    let hasMetadata = this.hasMetadata;

    if (!hasMetadata) {
      hasMetadata = Object.keys(mergedMetadata).length > 0;
    }

    const logger = Object.create(this.constructor.prototype) as this;

    Object.defineProperties(logger, {
      'cachedMetadataString': {
        'enumerable': false,
        'value': undefined,
        'writable': true
      },
      'hasMetadata': {
        'enumerable': false,
        'value': hasMetadata,
        'writable': false
      },
      'includeTimestamp': {
        'enumerable': false,
        'value': this.includeTimestamp,
        'writable': false
      },
      'metadata': {
        'enumerable': false,
        'value': mergedMetadata,
        'writable': false
      },
      'minLevel': {
        'enumerable': false,
        'value': this.minLevel,
        'writable': false
      },
      'prefix': {
        'enumerable': false,
        'value': this.prefix,
        'writable': false
      }
    });

    this.initChild(logger);

    return logger;
  }

  /**
   * Hook called by createChild() after the base ConsoleLogger fields are defined.
   * Override in subclasses to initialize subclass-specific instance fields
   * on the child object (e.g., arrays, maps, or other mutable state).
   * Default is a no-op.
   */
  protected initChild(_child: this): void {}

  /**
   * Dispatches a formatted log entry to the appropriate console method.
   * Subclasses override this to redirect output (e.g., to an array, remote sink).
   */
  protected emit(level: LogLevelType, formattedMessage: string, data: LogDataType): void {
    const fn = consoleDispatch[level];
    if (fn !== undefined) {
      fn(formattedMessage, data);
    }
  }

  protected formatMessage(message: string): string {
    if (!this.includeTimestamp && !this.prefix && !this.hasMetadata) {
      return message;
    }

    let result = '';

    if (this.includeTimestamp) {
      result = `[${new Date().toISOString()}] `;
    }

    if (this.prefix) {
      result += `${this.prefix} `;
    }

    if (this.hasMetadata) {
      result += `${this.getMetadataString()} `;
    }

    return result + message;
  }

  protected getMetadataString(): string {
    if (!this.hasMetadata) {
      return '';
    }

    if (this.cachedMetadataString === undefined) {
      try {
        this.cachedMetadataString = safeStringify(this.metadata);
      } catch {
        this.cachedMetadataString = '[Serialization Error]';
      }
    }

    return this.cachedMetadataString;
  }

  /**
   * Returns true if a message at the given level should be logged.
   * Subclasses override to add custom filtering logic.
   */
  protected shouldLog(level: LogLevelType): boolean {
    return this.minLevel <= level;
  }
}
