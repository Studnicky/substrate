import type { ConsoleTransportOptionsEntity } from '../entities/ConsoleTransportOptionsEntity.js';
import type { LogRecordEntity } from '../entities/LogRecordEntity.js';
import type { TransportInterface } from './TransportInterface.js';

import { LOG_LEVEL } from '../constants/LOG_LEVEL.js';
import { ResolveMinLevel } from '../modules/ResolveMinLevel.js';
import { SafeStringify } from '../modules/safeStringify.js';

interface ConsoleFunctionInterface {
  (message: string, record: LogRecordEntity.Type): void;
}

/**
 * Dispatch map from numeric log level to the corresponding console method.
 * SILENT has no entry — records at that level are filtered before reaching here.
 *
 * NOTE: This is the ONLY file in the package permitted to use `console`.
 * All other modules route output through this transport.
 */
const consoleDispatch = new Map<number, ConsoleFunctionInterface>([
  [LOG_LEVEL.DEBUG, (msg, rec) => { console.debug(msg, rec); }],
  [LOG_LEVEL.ERROR, (msg, rec) => { console.error(msg, rec); }],
  [LOG_LEVEL.INFO, (msg, rec) => { console.info(msg, rec); }],
  [LOG_LEVEL.TRACE, (msg, rec) => { console.trace(msg, rec); }],
  [LOG_LEVEL.WARN, (msg, rec) => { console.warn(msg, rec); }]
]);

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
  static create(options: ConsoleTransportOptionsEntity.Type = {}): ConsoleTransport {
    return new this(options);
  }

  readonly #minLevel: number;

  protected constructor(options: ConsoleTransportOptionsEntity.Type = {}) {
    this.#minLevel = ResolveMinLevel.from(options);
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
    const dispatch = consoleDispatch.get(record.level);

    if (dispatch !== undefined) {
      dispatch(message, record);
    }
  }
}
