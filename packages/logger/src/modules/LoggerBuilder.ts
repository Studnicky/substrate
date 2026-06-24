import type { LoggerOptionsInterface } from '../interfaces/LoggerOptionsInterface.js';
import type { Logger } from './Logger.js';

export class LoggerBuilder {
  static create(create: (options: LoggerOptionsInterface) => Logger): LoggerBuilder {
    return new LoggerBuilder(create);
  }

  readonly #create: (options: LoggerOptionsInterface) => Logger;
  #options: LoggerOptionsInterface = {};

  private constructor(create: (options: LoggerOptionsInterface) => Logger) {
    this.#create = create;
  }

  withLevel(level: LoggerOptionsInterface['level']): this {
    if (level !== undefined) {
      this.#options = { ...this.#options, 'level': level };
    }
    return this;
  }

  withMetadata(metadata: LoggerOptionsInterface['metadata']): this {
    if (metadata !== undefined) {
      this.#options = { ...this.#options, 'metadata': metadata };
    }
    return this;
  }

  withTransports(transports: LoggerOptionsInterface['transports']): this {
    if (transports !== undefined) {
      this.#options = { ...this.#options, 'transports': transports };
    }
    return this;
  }

  build(): Logger {
    const result = this.#create(this.#options);
    return result;
  }
}
