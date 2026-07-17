import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import type { LogRecordEntity } from '../entities/LogRecordEntity.js';
import type { LoggerInterface } from '../interfaces/LoggerInterface.js';
import type { LoggerOptionsInterface } from '../interfaces/LoggerOptionsInterface.js';
import type { TransportInterface } from '../transports/TransportInterface.js';
import type { HookErrorEntryType } from '../types/HookErrorEntryType.js';
import type { LogDataType } from '../types/LogDataType.js';
import type { LogLevelType } from '../types/LogLevelType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';

import { LOG_LEVEL } from '../constants/LOG_LEVEL.js';
import { configValidation } from './configValidation.js';
import { LoggerBuilder } from './LoggerBuilder.js';
import { ParseLogLevel } from './parseLogLevel.js';

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
  readonly #hookErrors: HookErrorEntryType[] = [];
  protected readonly hooks: HookInvoker = new HookInvoker();

  protected constructor(options: LoggerOptionsInterface = {}) {
    configValidation.assertPlainObject(options.metadata, 'metadata');
    if (options.transports !== undefined && !Array.isArray(options.transports)) {
      throw new Error('transports must be an array');
    }

    this.#level = options.level !== undefined
      ? ParseLogLevel.parse(options.level)
      : LOG_LEVEL.INFO;
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
    this.hooks.invoke('onChildCreate', () => {
      const result = this.onChildCreate(metadata);
      return result;
    });
    return result;
  }

  /** Count of hook failures recorded when `onTransportError` itself throws. */
  public get hookErrorCount(): number {
    const result = this.#hookErrors.length;
    return result;
  }

  /** Returns a defensive copy of hook failures recorded when `onTransportError` itself throws. */
  public getHookErrors(): readonly HookErrorEntryType[] {
    const result = [...this.#hookErrors];
    return result;
  }

  /**
   * Emits a debug record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.build()
   */
  debug(data: LogDataType): void {
    this.emit(LOG_LEVEL.DEBUG, data);
  }

  /**
   * Emits an error record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.build() or LogFault.build()
   */
  error(data: LogDataType): void {
    this.emit(LOG_LEVEL.ERROR, data);
  }

  /**
   * Emits an info record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.build()
   */
  info(data: LogDataType): void {
    this.emit(LOG_LEVEL.INFO, data);
  }

  /**
   * Emits a trace record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.build()
   */
  trace(data: LogDataType): void {
    this.emit(LOG_LEVEL.TRACE, data);
  }

  /**
   * Emits a warn record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.build() or LogFault.build()
   */
  warn(data: LogDataType): void {
    this.emit(LOG_LEVEL.WARN, data);
  }

  private emit(level: LogLevelType, data: LogDataType): void {
    if (level < this.#level) {
      this.hooks.invoke('onDropped', () => {
        const result = this.onDropped(level);
        return result;
      });
      return;
    }

    const record: LogRecordEntity.Type = {
      'data': data,
      'level': level,
      'metadata': this.#metadata,
      'time': Date.now()
    };

    this.hooks.invoke('onLog', () => {
      const result = this.onLog(level, record);
      return result;
    });

    const count = this.#transports.length;

    for (let i = 0; i < count; i += 1) {
      const transport = this.#transports[i];
      if (transport === undefined) { continue; }
      this.writeToTransport(transport, record);
    }
  }

  private writeToTransport(transport: TransportInterface, record: LogRecordEntity.Type): void {
    try {
      transport.write(record);
    } catch (error) {
      // One failing transport must not prevent others from receiving the record.
      // A broken `onTransportError` override itself must not abort the fan-out
      // either — its failure is recorded here instead of propagating; see
      // `hookErrorCount`/`getHookErrors()`.
      try {
        this.hooks.invoke('onTransportError', () => {
          const result = this.onTransportError(transport, record, error);
          return result;
        });
      } catch (hookError) {
        this.#hookErrors.push({
          'cause': hookError instanceof HookInvocationError ? hookError.cause : hookError,
          'hookName': 'onTransportError'
        });
      }
    }
  }

  /**
   * Hook called after a record is assembled and before fan-out to transports.
   * Override in subclasses to observe every emitted record.
   * Default implementation is a no-op.
   */
  protected onLog(_level: LogLevelType, _record: LogRecordEntity.Type): void {}

  /**
   * Hook called when a record is below the logger's level floor and is discarded.
   * Override in subclasses to observe dropped records.
   * Default implementation is a no-op.
   */
  protected onDropped(_level: LogLevelType): void {}

  /**
   * Hook called after a child logger is created via `.child()`.
   * Override in subclasses to observe child logger creation.
   * Default implementation is a no-op.
   */
  protected onChildCreate(_bindings: LogMetadataType): void {}

  /**
   * Hook called when a transport's `write()` throws.
   * Override in subclasses to observe transport errors.
   * A throwing override does not abort fan-out to remaining transports; the
   * failure is recorded and available via `hookErrorCount`/`getHookErrors()`.
   * Default implementation is a no-op.
   */
  protected onTransportError(_transport: TransportInterface, _record: LogRecordEntity.Type, _error: unknown): void {}
}
