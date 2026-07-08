import type { LogRecordType } from '../types/LogRecordType.js';
import type { FunctionTransportOptionsType } from './FunctionTransportOptionsType.js';
import type { TransportInterface } from './TransportInterface.js';

import { LOG_LEVEL } from '../constants/LOG_LEVEL.js';
import { ConfigurationError } from '../errors/ConfigurationError.js';
import { parseLogLevel } from '../modules/parseLogLevel.js';
import { FunctionTransportBuilder } from './FunctionTransportBuilder.js';

/**
 * Transport that delegates record delivery to a user-supplied function.
 *
 * This is the generic adapter for bridging to any external logger (pino,
 * winston, Bunyan, etc.). Pass a function that extracts what the external
 * library needs from the `LogRecordType`.
 *
 * @example
 * ```typescript
 * import pino from 'pino';
 * const pinoLogger = pino();
 *
 * const transport = FunctionTransport.create((record) => {
 *   pinoLogger[record.level](record.metadata, record.data.message);
 * });
 *
 * const logger = Logger.create({ transports: [transport] });
 * ```
 */
export class FunctionTransport implements TransportInterface {
  /**
   * Creates a new FunctionTransport.
   *
   * @param sink - Function called with each record that passes the level filter
   * @param options - Optional configuration for this transport
   * @returns A new FunctionTransport instance
   */
  static create(
    sink: (record: LogRecordType) => void,
    options: FunctionTransportOptionsType = {}
  ): FunctionTransport {
    return new this(sink, options);
  }

  static builder(): FunctionTransportBuilder {
    const result = FunctionTransportBuilder.create((sink, options) => { const result = FunctionTransport.create(sink, options); return result; });
    return result;
  }

  readonly #minLevel: number;
  readonly #sink: (record: LogRecordType) => void;

  protected constructor(sink: (record: LogRecordType) => void, options: FunctionTransportOptionsType = {}) {
    if (typeof sink !== 'function') {
      throw new ConfigurationError('sink must be a function');
    }
    if (options.level !== undefined
      && typeof options.level !== 'string'
      && typeof options.level !== 'number') {
      throw new ConfigurationError('level must be a string or number');
    }
    this.#sink = sink;
    this.#minLevel = options.level !== undefined
      ? parseLogLevel(options.level)
      : LOG_LEVEL.TRACE;
  }

  /**
   * Calls the sink with the record if its level meets this transport's floor.
   *
   * @param record - Assembled log record from the Logger core
   */
  write(record: LogRecordType): void {
    if (record.level < this.#minLevel) {
      return;
    }
    this.#sink(record);
  }
}
