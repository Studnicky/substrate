import type { LoggerInterface } from '../interfaces/LoggerInterface.js';
import type { LoggerOptionsInterface } from '../interfaces/LoggerOptionsInterface.js';
import type { TransportInterface } from '../transports/TransportInterface.js';
import type { LogDataType } from '../types/LogDataType.js';
import type { LogLevelType } from '../types/LogLevelType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';
import type { LogRecordType } from '../types/LogRecordType.js';

import { LogLevel } from '../constants/LogLevel.js';
import { configValidation } from './configValidation.js';
import { LoggerBuilder } from './LoggerBuilder.js';
import { parseLogLevel } from './parseLogLevel.js';

/**
 * Core logger with pluggable transport architecture.
 *
 * The global level acts as a floor — records below it are discarded before
 * reaching any transport. Each transport may apply its own, higher floor via
 * its `level` option. A Logger with no transports is valid and silent.
 *
 * @example
 * ```typescript
 * import { Logger, ConsoleTransport, MemoryTransport } from '@studnicky/logger';
 *
 * const memory = MemoryTransport.create();
 * const logger = Logger.create({
 *   level: 'debug',
 *   metadata: { service: 'api' },
 *   transports: [ConsoleTransport.create({ level: 'warn' }), memory]
 * });
 *
 * logger.info(body);   // reaches MemoryTransport only (ConsoleTransport floor is warn)
 * logger.warn(body);   // reaches both transports
 *
 * const child = logger.child({ requestId: 'abc' });
 * child.error(fault);  // metadata merged: { service: 'api', requestId: 'abc' }
 * ```
 */
export class Logger implements LoggerInterface {
  /**
   * Creates a new Logger instance.
   *
   * @param options - Configuration for the logger
   * @returns A new Logger instance
   */
  static create(options: LoggerOptionsInterface = {}): Logger {
    return new this(options);
  }

  static builder(): LoggerBuilder {
    const result = LoggerBuilder.create((options) => { const result = Logger.create(options); return result; });
    return result;
  }

  readonly #level: LogLevelType;
  readonly #metadata: LogMetadataType;
  readonly #transports: readonly TransportInterface[];

  protected constructor(options: LoggerOptionsInterface = {}) {
    configValidation.assertPlainObject(options.metadata, 'metadata');
    if (options.transports !== undefined && !Array.isArray(options.transports)) {
      throw new Error('transports must be an array');
    }

    this.#level = options.level !== undefined
      ? parseLogLevel(options.level)
      : LogLevel.INFO;
    this.#metadata = options.metadata ?? {};
    this.#transports = options.transports ?? [];
  }

  /**
   * Creates a child logger sharing the same level and transports with
   * metadata merged from the parent.
   *
   * @param metadata - Additional metadata to include in all child log records
   * @returns A new Logger with merged metadata
   */
  child(metadata: LogMetadataType): Logger {
    const result = Logger.create({
      'level': this.#level,
      'metadata': { ...this.#metadata, ...metadata },
      'transports': this.#transports
    });
    return result;
  }

  /**
   * Emits a debug record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.build()
   */
  debug(data: LogDataType): void {
    this.emit(LogLevel.DEBUG, data);
  }

  /**
   * Emits an error record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.build() or LogFault.build()
   */
  error(data: LogDataType): void {
    this.emit(LogLevel.ERROR, data);
  }

  /**
   * Emits an info record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.build()
   */
  info(data: LogDataType): void {
    this.emit(LogLevel.INFO, data);
  }

  /**
   * Emits a trace record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.build()
   */
  trace(data: LogDataType): void {
    this.emit(LogLevel.TRACE, data);
  }

  /**
   * Emits a warn record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.build() or LogFault.build()
   */
  warn(data: LogDataType): void {
    this.emit(LogLevel.WARN, data);
  }

  private emit(level: LogLevelType, data: LogDataType): void {
    if (level < this.#level) {
      return;
    }

    const record: LogRecordType = {
      'data': data,
      'level': level,
      'metadata': this.#metadata,
      'time': Date.now()
    };

    const count = this.#transports.length;

    for (let i = 0; i < count; i += 1) {
      const transport = this.#transports[i];
      if (transport === undefined) { continue; }
      this.writeToTransport(transport, record);
    }
  }

  private writeToTransport(transport: TransportInterface, record: LogRecordType): void {
    try {
      transport.write(record);
    } catch {
      // One failing transport must not prevent others from receiving the record.
    }
  }
}
