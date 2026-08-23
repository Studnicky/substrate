import type { ConsoleTransportOptionsEntity } from '../entities/ConsoleTransportOptionsEntity.js';
import type { LogRecordEntity } from '../entities/LogRecordEntity.js';
import type { TransportInterface } from './TransportInterface.js';

import { LOG_LEVEL } from '../constants/LOG_LEVEL.js';
import { ResolveMinimumLevel } from '../modules/ResolveMinimumLevel.js';
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
  [
    LOG_LEVEL.DEBUG,
    (message, rec) => {
      console.debug(message, rec);
    }
  ],
  [
    LOG_LEVEL.ERROR,
    (message, rec) => {
      console.error(message, rec);
    }
  ],
  [
    LOG_LEVEL.INFO,
    (message, rec) => {
      console.info(message, rec);
    }
  ],
  [
    LOG_LEVEL.TRACE,
    (message, rec) => {
      console.trace(message, rec);
    }
  ],
  [
    LOG_LEVEL.WARN,
    (message, rec) => {
      console.warn(message, rec);
    }
  ]
]);

interface ConsoleTransportSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class ConsoleTransportInstance {
  static belongsTo<TInstance>(
    constructor: ConsoleTransportSubclassInterface<TInstance>,
    value: unknown
  ): value is TInstance {
    const result = value instanceof constructor;

    return result;
  }
}

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
  static create<TInstance extends ConsoleTransport = ConsoleTransport>(
    this: ConsoleTransportSubclassInterface<TInstance>,
    options: ConsoleTransportOptionsEntity.Type = {}
  ): TInstance {
    const result: unknown = Reflect.construct(this, [options]);

    if (!ConsoleTransportInstance.belongsTo(this, result)) {
      throw new TypeError('ConsoleTransport.create() did not construct the requested subclass.');
    }

    return result;
  }

  readonly #minimumLevel: number;

  protected constructor(options: ConsoleTransportOptionsEntity.Type = {}) {
    this.#minimumLevel = ResolveMinimumLevel.from(options);
  }

  /**
   * Writes the record to the console if its level meets this transport's floor.
   *
   * @param record - Assembled log record from the Logger core
   */
  write(record: LogRecordEntity.Type): void {
    if (record.level < this.#minimumLevel) {
      return;
    }

    const metadataString = Object.keys(record.metadata).length > 0
      ? `${SafeStringify.stringify(record.metadata)} `
      : '';

    const message = `${metadataString}${record.data.message}`;
    const dispatch = consoleDispatch.get(record.level);

    if (dispatch !== undefined) {
      dispatch(message, record);
    }
  }
}
