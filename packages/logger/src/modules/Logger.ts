import { type HookInvocationError, HookInvoker } from '@studnicky/errors';

import type { LogDataEntity } from '../entities/LogDataEntity.js';
import type { LogLevelEntity } from '../entities/LogLevelEntity.js';
import type { LogRecordEntity } from '../entities/LogRecordEntity.js';
import type { LoggerInterface } from '../interfaces/LoggerInterface.js';
import type { LoggerOptionsInterface } from '../interfaces/LoggerOptionsInterface.js';
import type { LogMetadataInterface } from '../interfaces/LogMetadataInterface.js';
import type { TransportInterface } from '../transports/TransportInterface.js';

import { LOG_LEVEL } from '../constants/LOG_LEVEL.js';
import { configValidation } from './configValidation.js';
import { ImmutableSnapshot } from './ImmutableSnapshot.js';
import { ParseLogLevel } from './parseLogLevel.js';

class TransportErrorHookInvoker extends HookInvoker {
  protected override onHookError(): void {}
}

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

  readonly #level: LogLevelEntity.Type;
  readonly #metadata: LogMetadataInterface;
  readonly #transports: readonly TransportInterface[];
  readonly #transportErrorHooks = new TransportErrorHookInvoker();
  protected readonly hooks: HookInvoker = new HookInvoker();

  protected constructor(options: LoggerOptionsInterface = {}) {
    configValidation.assertPlainObject(options.metadata, 'metadata');
    configValidation.assertArray(options.transports, 'transports');

    this.#level = options.level !== undefined
      ? ParseLogLevel.parse(options.level)
      : LOG_LEVEL.INFO;
    this.#metadata = ImmutableSnapshot.from(options.metadata ?? {});
    this.#transports = Object.freeze(Array.from(options.transports ?? []));
  }

  /**
   * Creates a child logger sharing the same level and transports with
   * metadata merged from the parent.
   *
   * @param metadata - Additional metadata to include in all child log records
   * @returns A new Logger with merged metadata
   */
  child(metadata: LogMetadataInterface): Logger {
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
    const result = this.#transportErrorHooks.hookErrorCount;
    return result;
  }

  /** Returns a defensive copy of hook failures recorded when `onTransportError` itself throws. */
  public getHookErrors(): readonly HookInvocationError[] {
    const result = this.#transportErrorHooks.getHookErrors();
    return result;
  }

  /**
   * Emits a debug record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.create()
   */
  debug(data: LogDataEntity.Type): void {
    this.emit(LOG_LEVEL.DEBUG, data);
  }

  /**
   * Emits an error record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.create() or LogFault.create()
   */
  error(data: LogDataEntity.Type): void {
    this.emit(LOG_LEVEL.ERROR, data);
  }

  /**
   * Emits an info record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.create()
   */
  info(data: LogDataEntity.Type): void {
    this.emit(LOG_LEVEL.INFO, data);
  }

  /**
   * Emits a trace record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.create()
   */
  trace(data: LogDataEntity.Type): void {
    this.emit(LOG_LEVEL.TRACE, data);
  }

  /**
   * Emits a warn record to all transports that meet the level floor.
   *
   * @param data - Structured log data from LogBody.create() or LogFault.create()
   */
  warn(data: LogDataEntity.Type): void {
    this.emit(LOG_LEVEL.WARN, data);
  }

  private emit(level: LogLevelEntity.Type, data: LogDataEntity.Type): void {
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
      // either — its failure is recorded instead of propagating; see
      // `hookErrorCount`/`getHookErrors()`.
      this.#transportErrorHooks.invoke(
        'onTransportError',
        () => {
          const result = this.onTransportError(transport, record, error);
          return result;
        }
      );
    }
  }

  /**
   * Hook called after a record is assembled and before fan-out to transports.
   * Override in subclasses to observe every emitted record.
   * Default implementation is a no-op.
   */
  protected onLog(_level: LogLevelEntity.Type, _record: LogRecordEntity.Type): void {}

  /**
   * Hook called when a record is below the logger's level floor and is discarded.
   * Override in subclasses to observe dropped records.
   * Default implementation is a no-op.
   */
  protected onDropped(_level: LogLevelEntity.Type): void {}

  /**
   * Hook called after a child logger is created via `.child()`.
   * Override in subclasses to observe child logger creation.
   * Default implementation is a no-op.
   */
  protected onChildCreate(_bindings: LogMetadataInterface): void {}

  /**
   * Hook called when a transport's `write()` throws.
   * Override in subclasses to observe transport errors.
   * A throwing override does not abort fan-out to remaining transports; the
   * failure is recorded and available via `hookErrorCount`/`getHookErrors()`.
   * Default implementation is a no-op.
   */
  protected onTransportError(_transport: TransportInterface, _record: LogRecordEntity.Type, _error: unknown): void {}
}
