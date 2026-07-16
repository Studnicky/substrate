import type { LogRecordEntity } from '../entities/LogRecordEntity.js';
import type { ConsoleTransportOptionsType } from './ConsoleTransportOptionsType.js';
import type { TransportInterface } from './TransportInterface.js';

import { LOG_LEVEL } from '../constants/LOG_LEVEL.js';
import { ConfigurationError } from '../errors/ConfigurationError.js';
import { ParseLogLevel } from '../modules/parseLogLevel.js';
import { SafeStringify } from '../modules/safeStringify.js';
import { ConsoleTransportBuilder } from './ConsoleTransportBuilder.js';

type ConsoleFn = (message: string, record: LogRecordEntity.Type) => void;

/**
 * Dispatch map from numeric log level to the corresponding console method.
 * SILENT has no entry — records at that level are filtered before reaching here.
 *
 * NOTE: This is the ONLY file in the package permitted to use `console`.
 * All other modules route output through this transport.
 */
const consoleDispatch: Record<number, ConsoleFn> = {};
consoleDispatch[LOG_LEVEL.TRACE] = (msg, rec) => { console.trace(msg, rec); };
consoleDispatch[LOG_LEVEL.DEBUG] = (msg, rec) => { console.debug(msg, rec); };
consoleDispatch[LOG_LEVEL.INFO]  = (msg, rec) => { console.info(msg, rec); };
consoleDispatch[LOG_LEVEL.WARN]  = (msg, rec) => { console.warn(msg, rec); };
consoleDispatch[LOG_LEVEL.ERROR] = (msg, rec) => { console.error(msg, rec); };

/**
 * Transport that writes records to the console using the level-appropriate method.
 *
 * This is the only file in the package permitted to reference `console`. All other
 * files route output through this transport.
 *
 * @example
 * ```typescript
 * const logger = Logger.create({
 *   level: 'debug',
 *   transports: [ConsoleTransport.create({ level: 'debug' })]
 * });
 * ```
 */
export class ConsoleTransport implements TransportInterface {
  /**
   * Creates a new ConsoleTransport with optional per-transport level filtering.
   *
   * @param options - Optional configuration for this transport
   * @returns A new ConsoleTransport instance
   */
  static create(options: ConsoleTransportOptionsType = {}): ConsoleTransport {
    return new this(options);
  }

  static builder(): ConsoleTransportBuilder {
    const result = ConsoleTransportBuilder.create((options) => { const result = ConsoleTransport.create(options); return result; });
    return result;
  }

  readonly #minLevel: number;

  protected constructor(options: ConsoleTransportOptionsType = {}) {
    if (options.level !== undefined
      && typeof options.level !== 'string'
      && typeof options.level !== 'number') {
      throw new ConfigurationError('level must be a string or number');
    }
    this.#minLevel = options.level !== undefined
      ? ParseLogLevel.parse(options.level)
      : LOG_LEVEL.TRACE;
  }

  /**
   * Writes the record to the console if its level meets this transport's floor.
   *
   * @param record - Assembled log record from the Logger core
   */
  write(record: LogRecordEntity.Type): void {
    if (record.level < this.#minLevel) {
      return;
    }

    const metaStr = Object.keys(record.metadata).length > 0
      ? `${SafeStringify.stringify(record.metadata)} `
      : '';

    const message = `${metaStr}${record.data.message}`;
    const dispatch = consoleDispatch[record.level];

    if (dispatch !== undefined) {
      dispatch(message, record);
    }
  }
}
