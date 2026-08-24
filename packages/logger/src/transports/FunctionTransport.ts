import { Guard } from '@studnicky/types';

import type { FunctionTransportOptionsEntity } from '../entities/FunctionTransportOptionsEntity.js';
import type { LogRecordEntity } from '../entities/LogRecordEntity.js';
import type { TransportInterface } from './TransportInterface.js';

import { ConfigurationError } from '../errors/ConfigurationError.js';
import { ResolveMinimumLevel } from '../modules/ResolveMinimumLevel.js';

interface FunctionTransportSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class FunctionTransportInstance {
  static belongsTo<TInstance extends object>(
    constructor: FunctionTransportSubclassInterface<TInstance>,
    value: object
  ): value is TInstance {
    const result = value instanceof constructor;

    return result;
  }
}

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
  static create<TInstance extends FunctionTransport = FunctionTransport>(
    this: FunctionTransportSubclassInterface<TInstance>,
    sink: (record: LogRecordEntity.Type) => void,
    options: FunctionTransportOptionsEntity.Type = {}
  ): TInstance {
    const result: unknown = Reflect.construct(this, [
      sink,
      options
    ]);

    if (!Guard.isObjectLike(result) || !FunctionTransportInstance.belongsTo(this, result)) {
      throw new TypeError('FunctionTransport.create() did not construct the requested subclass.');
    }

    return result;
  }

  readonly #minimumLevel: number;
  readonly #sink: (record: LogRecordEntity.Type) => void;

  protected constructor(sink: (record: LogRecordEntity.Type) => void, options: FunctionTransportOptionsEntity.Type = {}) {
    if (typeof sink !== 'function') {
      throw new ConfigurationError('sink must be a function');
    }
    this.#sink = sink;
    this.#minimumLevel = ResolveMinimumLevel.from(options);
  }

  /**
   * Calls the sink with the record if its level meets this transport's floor.
   *
   * @param record - Assembled log record from the Logger core
   */
  write(record: LogRecordEntity.Type): void {
    if (record.level < this.#minimumLevel) {
      return;
    }
    this.#sink(record);
  }
}
