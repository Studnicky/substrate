import type { FunctionTransportOptionsEntity } from '../entities/FunctionTransportOptionsEntity.js';
import type { LogRecordEntity } from '../entities/LogRecordEntity.js';
import type { TransportInterface } from './TransportInterface.js';

import { ConfigurationError } from '../errors/ConfigurationError.js';
import { ResolveMinLevel } from '../modules/ResolveMinLevel.js';

/**
 * Transport that delegates record delivery to a user-supplied function.
 *
 * This is the generic adapter for bridging to any external logger (pino,
 * winston, Bunyan, etc.). Pass a function that extracts what the external
 * library needs from the `LogRecordEntity.Type`.
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
    sink: (record: LogRecordEntity.Type) => void,
    options: FunctionTransportOptionsEntity.Type = {}
  ): FunctionTransport {
    return new this(sink, options);
  }

  readonly #minLevel: number;
  readonly #sink: (record: LogRecordEntity.Type) => void;

  protected constructor(sink: (record: LogRecordEntity.Type) => void, options: FunctionTransportOptionsEntity.Type = {}) {
    if (typeof sink !== 'function') {
      throw new ConfigurationError('sink must be a function');
    }
    this.#sink = sink;
    this.#minLevel = ResolveMinLevel.from(options);
  }

  /**
   * Calls the sink with the record if its level meets this transport's floor.
   *
   * @param record - Assembled log record from the Logger core
   */
  write(record: LogRecordEntity.Type): void {
    if (record.level < this.#minLevel) {
      return;
    }
    this.#sink(record);
  }
}
