import type { LogRecordEntity } from '../entities/LogRecordEntity.js';
import type { TransportInterface } from './TransportInterface.js';

interface NoOpTransportSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class NoOpTransportInstance {
  static belongsTo<TInstance>(
    constructor: NoOpTransportSubclassInterface<TInstance>,
    value: unknown
  ): value is TInstance {
    return value instanceof constructor;
  }
}

/**
 * Transport that discards all records.
 *
 * Useful as a default no-output sink, in tests where output is unwanted,
 * or to silence a logger that would otherwise have no transports.
 *
 * @example
 * ```typescript
 * const logger = Logger.create({
 *   transports: [NoOpTransport.create()]
 * });
 * // All log calls are discarded
 * ```
 */
export class NoOpTransport implements TransportInterface {
  /**
   * Creates a new NoOpTransport instance.
   *
   * @returns A new NoOpTransport instance
   */
  static create<TInstance extends NoOpTransport = NoOpTransport>(
    this: NoOpTransportSubclassInterface<TInstance>
  ): TInstance {
    const result: unknown = Reflect.construct(this, []);
    if (!NoOpTransportInstance.belongsTo(this, result)) {
      throw new TypeError('NoOpTransport.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected constructor() {}

  /** Discards the record without any output or side-effects. */
  write(_record: LogRecordEntity.Type): void {}
}
