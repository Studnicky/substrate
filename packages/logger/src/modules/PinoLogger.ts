import pino from 'pino';

import type { LoggerInterface } from '../interfaces/LoggerInterface.js';
import type { PinoLoggerConfigType } from '../interfaces/PinoLoggerConfigType.js';
import type { LogDataType } from '../types/LogDataType.js';
import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';

import { LogLevel } from '../constants/LogLevel.js';
import { configValidation } from './configValidation.js';
import { parseLogLevel } from './parseLogLevel.js';
import { PinoLoggerBuilder } from './PinoLoggerBuilder.js';

/**
 * High-performance logger implementation using Pino library
 *
 * Features:
 * - Structured JSON logging with zero-overhead serialization
 * - Optional pretty-printing for development environments
 * - File destination support for persistent logs
 * - Child logger with metadata inheritance
 * - Automatic NODE_ENV detection for environment-appropriate defaults
 *
 * @example
 * ```typescript
 * // Basic usage with pretty printing
 * const logger = PinoLogger.create({ level: 'debug', pretty: true });
 * logger.info('Application started');
 *
 * // With metadata and file destination
 * const logger = PinoLogger.create({
 *   level: 'info',
 *   destination: '/var/log/app.log',
 *   metadata: { service: 'api', version: '1.0.0' }
 * });
 *
 * // Using builder pattern
 * const logger = PinoLogger.builder()
 *   .withLevel('debug')
 *   .withPretty(true)
 *   .withMetadata({ requestId: '123' })
 *   .build();
 *
 * // Child logger inherits metadata
 * const requestLogger = logger.child({ requestId: '123' });
 * requestLogger.info('Processing request'); // Includes requestId in metadata
 * ```
 */
export class PinoLogger implements LoggerInterface {
  /**
   * Creates a builder for fluent PinoLogger configuration.
   *
   * @returns A new PinoLoggerBuilder instance
   *
   * @example
   * ```typescript
   * const logger = PinoLogger.builder()
   *   .level('debug')
   *   .pretty(true)
   *   .metadata({ service: 'api' })
   *   .build();
   * ```
   */
  static builder(): PinoLoggerBuilder<PinoLogger> {
    const result = PinoLoggerBuilder.create((config) => {
      const result = new PinoLogger(config);
      return result;
    });
    return result;
  }


  /**
   * Creates a new PinoLogger instance with the specified configuration
   *
   * @param config - Configuration options for the logger
   * @returns A new PinoLogger instance
   *
   * @example
   * ```typescript
   * const logger = PinoLogger.create({ level: 'info', pretty: true });
   * logger.info('Server started');
   * ```
   */
  static create(config: PinoLoggerConfigType = {}): PinoLogger {
    const result = new PinoLogger(config);
    return result;
  }


  protected static fromInstance(instance: pino.Logger): PinoLogger {
    const logger = Object.create(PinoLogger.prototype) as PinoLogger;

    Object.defineProperty(logger, 'pinoInstance', {
      'configurable': false,
      'enumerable': false,
      'value': instance,
      'writable': false
    });

    return logger;
  }

  protected readonly pinoInstance: pino.Logger;

  constructor(config: PinoLoggerConfigType = {}) {
    configValidation.assertBoolean(config.pretty, 'pretty');
    configValidation.assertString(config.destination, 'destination');
    configValidation.assertPlainObject(config.metadata, 'metadata');
    configValidation.assertString(config.name, 'name');
    configValidation.assertBoolean(config.safe, 'safe');
    configValidation.assertPlainObject(config.serializers, 'serializers');
    configValidation.assertBooleanOrFunction(config.timestamp, 'timestamp');
    configValidation.assertString(config.messageKey, 'messageKey');
    configValidation.assertString(config.errorKey, 'errorKey');
    configValidation.assertString(config.nestedKey, 'nestedKey');
    configValidation.assertBoolean(config.enabled, 'enabled');
    configValidation.assertArrayOrObject(config.redact, 'redact');
    configValidation.assertPlainObject(config.formatters, 'formatters');
    configValidation.assertFunction(config.mixin, 'mixin');

    const level = this.mapLogLevel(config.level ?? LogLevel.INFO);
    // Disable pretty mode in CI environments to avoid worker thread issues
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const usePretty = config.pretty ?? (!isCI && process.env.NODE_ENV !== 'production');

    const pinoConfig = {
      'level': level,
      ...(config.enabled !== undefined    && { 'enabled':     config.enabled }),
      ...(config.errorKey !== undefined   && { 'errorKey':    config.errorKey }),
      ...(config.formatters !== undefined && { 'formatters':  config.formatters }),
      ...(config.messageKey !== undefined && { 'messageKey':  config.messageKey }),
      ...(config.mixin !== undefined      && { 'mixin':        config.mixin }),
      ...(config.name !== undefined       && { 'name':         config.name }),
      ...(config.nestedKey !== undefined  && { 'nestedKey':   config.nestedKey }),
      ...(config.redact !== undefined     && { 'redact':       config.redact }),
      ...(config.safe !== undefined       && { 'safe':         config.safe }),
      ...(config.serializers !== undefined && { 'serializers': config.serializers }),
      ...(config.timestamp !== undefined  && { 'timestamp':   config.timestamp }),
      ...(config.metadata !== undefined   && { 'base':         config.metadata })
    } as unknown as pino.LoggerOptions;

    // Handle transport configuration
    if (config.destination === undefined) {
      const transport = usePretty
        ? {
          'options': {
            'colorize': true,
            'translateTime': 'yyyy-mm-dd HH:MM:ss'
          },
          'target': 'pino-pretty'
        }
        : undefined;

      if (transport !== undefined) {
        pinoConfig.transport = transport;
      }

      this.pinoInstance = pino(pinoConfig);
    } else {
      const fileTransport = pino.transport({
        'options': { 'destination': config.destination },
        'target': 'pino/file'
      }) as pino.DestinationStream & { 'on': (event: 'error', handler: (err: Error) => void) => void };

      fileTransport.on('error', (err: Error) => {
        process.stderr.write(`[PinoLogger] Transport error: ${err.message}\n`);
      });

      this.pinoInstance = pino(pinoConfig, fileTransport as pino.DestinationStream);
    }
  }

  /**
   * Creates a child logger with additional metadata
   *
   * Child loggers inherit all metadata from their parent and merge it with
   * the provided metadata. All log messages from the child include both
   * parent and child metadata.
   *
   * @param metadata - Additional metadata to include in all child log messages
   * @returns A new instance of the same class with merged metadata
   *
   * @example
   * ```typescript
   * const logger = PinoLogger.create({ metadata: { service: 'api' } });
   * const requestLogger = logger.child({ requestId: '123' });
   * requestLogger.info('Processing'); // Includes service and requestId
   *
   * const operationLogger = requestLogger.child({ operation: 'upload' });
   * operationLogger.info('Starting'); // Includes service, requestId, and operation
   * ```
   */
  child(metadata: LogMetadataType): this {
    const pinoChild = this.createChildPino(metadata);
    return this.createChild(pinoChild);
  }

  /**
   * Logs a debug message (verbose)
   *
   * Use for detailed debugging information useful during development.
   * Typically disabled in production.
   *
   * @param data - Structured log data from LogBody.build()
   *
   * @example
   * ```typescript
   * logger.debug(LogBody.create()
   *   .component('service')
   *   .operation('process')
   *   .status(LOG_STATUS.PENDING)
   *   .message('Processing item')
   *   .context({ itemId: '123' })
   *   .build());
   * ```
   */
  debug(data: LogDataType): void {
    if (this.shouldLog(LogLevel.DEBUG, data)) {
      const transformed = this.transformData(data);
      this.pinoInstance.debug(transformed, transformed.message);
    }
  }

  /**
   * Logs an error message
   *
   * Use for error events that should be investigated immediately.
   * Always logged in all environments.
   *
   * @param data - Structured log data from LogBody.build() or LogFault.build()
   *
   * @example
   * ```typescript
   * logger.error(LogFault.create()
   *   .component('service')
   *   .operation('connect')
   *   .status(LOG_STATUS.FAILED)
   *   .fromError(error)
   *   .context({ database: 'users' })
   *   .build());
   * ```
   */
  error(data: LogDataType): void {
    if (this.shouldLog(LogLevel.ERROR, data)) {
      const transformed = this.transformData(data);
      this.pinoInstance.error(transformed, transformed.message);
    }
  }

  /**
   * Logs an informational message
   *
   * Use for general informational messages about application flow.
   * Safe for production use.
   *
   * @param data - Structured log data from LogBody.build()
   *
   * @example
   * ```typescript
   * logger.info(LogBody.create()
   *   .component('server')
   *   .operation('start')
   *   .status(LOG_STATUS.SUCCESS)
   *   .message('Application started')
   *   .context({ port: 3000 })
   *   .build());
   * ```
   */
  info(data: LogDataType): void {
    if (this.shouldLog(LogLevel.INFO, data)) {
      const transformed = this.transformData(data);
      this.pinoInstance.info(transformed, transformed.message);
    }
  }

  /**
   * Logs a trace message (most verbose)
   *
   * Use for detailed flow tracing and diagnostic information.
   * Typically disabled in production.
   *
   * @param data - Structured log data from LogBody.build()
   *
   * @example
   * ```typescript
   * logger.trace(LogBody.create()
   *   .component('function')
   *   .operation('calculate')
   *   .status(LOG_STATUS.IN_PROGRESS)
   *   .message('Entering calculateTotal')
   *   .context({ x: 10, y: 20 })
   *   .build());
   * ```
   */
  trace(data: LogDataType): void {
    if (this.shouldLog(LogLevel.TRACE, data)) {
      const transformed = this.transformData(data);
      this.pinoInstance.trace(transformed, transformed.message);
    }
  }

  /**
   * Logs a warning message
   *
   * Use for potentially harmful situations that should be investigated.
   * Always logged in all environments.
   *
   * @param data - Structured log data from LogBody.build() or LogFault.build()
   *
   * @example
   * ```typescript
   * logger.warn(LogBody.create()
   *   .component('api')
   *   .operation('deprecation')
   *   .status(LOG_STATUS.WARNING)
   *   .message('Deprecated endpoint called')
   *   .context({ endpoint: '/v1/users' })
   *   .build());
   * ```
   */
  warn(data: LogDataType): void {
    if (this.shouldLog(LogLevel.WARN, data)) {
      const transformed = this.transformData(data);
      this.pinoInstance.warn(transformed, transformed.message);
    }
  }

  /**
   * Creates a child PinoLogger from an existing pino instance.
   * Subclasses override to return the correct type.
   */
  protected createChild(pinoChild: pino.Logger): this {
    return (this.constructor as typeof PinoLogger).fromInstance(pinoChild) as this;
  }

  /**
   * Creates a pino child logger from the current instance's pino logger.
   * Subclasses override to intercept or modify the pino child creation.
   */
  protected createChildPino(metadata: LogMetadataType): pino.Logger {
    return this.pinoInstance.child(metadata);
  }

  protected mapLogLevel(level: LogLevelStringType | LogLevelType): pino.LevelWithSilent {
    const numericLevel = parseLogLevel(level);

    switch (numericLevel) {
      case LogLevel.DEBUG: return 'debug';
      case LogLevel.ERROR: return 'error';
      case LogLevel.INFO: return 'info';
      case LogLevel.SILENT: return 'silent';
      case LogLevel.TRACE: return 'trace';
      case LogLevel.WARN: return 'warn';
      default: return 'info';
    }
  }

  /**
   * Returns true if a message at the given level should be logged.
   * Default always returns true — pino handles level filtering internally.
   * Subclasses override to add pre-log filtering logic.
   */
  protected shouldLog(_level: LogLevelType, _data: LogDataType): boolean {
    return true;
  }

  /**
   * Transforms data before it is passed to pino.
   * Default returns data unchanged. Subclasses override to enrich or mutate.
   */
  protected transformData(data: LogDataType): LogDataType {
    return data;
  }
}
