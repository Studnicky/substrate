import type { LogRecordEntity } from '../entities/LogRecordEntity.js';
import type { FunctionTransport } from './FunctionTransport.js';
import type { FunctionTransportOptionsType } from './FunctionTransportOptionsType.js';

import { ConfigurationError } from '../errors/ConfigurationError.js';

export class FunctionTransportBuilder {
  static create(
    create: (sink: (record: LogRecordEntity.Type) => void, options: FunctionTransportOptionsType) => FunctionTransport
  ): FunctionTransportBuilder {
    return new FunctionTransportBuilder(create);
  }

  readonly #create: (sink: (record: LogRecordEntity.Type) => void, options: FunctionTransportOptionsType) => FunctionTransport;
  #sink: ((record: LogRecordEntity.Type) => void) | undefined;
  #options: FunctionTransportOptionsType = {};

  private constructor(create: (sink: (record: LogRecordEntity.Type) => void, options: FunctionTransportOptionsType) => FunctionTransport) {
    this.#create = create;
  }

  withSink(sink: (record: LogRecordEntity.Type) => void): this {
    this.#sink = sink;
    return this;
  }

  withLevel(level: FunctionTransportOptionsType['level']): this {
    if (level !== undefined) {
      this.#options = { ...this.#options, 'level': level };
    }
    return this;
  }

  build(): FunctionTransport {
    if (this.#sink === undefined) {
      throw new ConfigurationError('FunctionTransportBuilder: sink is required');
    }
    return this.#create(this.#sink, this.#options);
  }
}
