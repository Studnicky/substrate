/**
 * Fluent builder for UndiciDispatcher
 */

import type { DispatcherConfigType } from '../types/DispatcherConfigType.js';
import type { UndiciDispatcher } from './UndiciDispatcher.js';

/**
 * Fluent builder for constructing UndiciDispatcher instances
 */
export class UndiciDispatcherBuilder {
  static create(create: (options: DispatcherConfigType) => UndiciDispatcher): UndiciDispatcherBuilder {
    return new UndiciDispatcherBuilder(create);
  }

  readonly #create: (options: DispatcherConfigType) => UndiciDispatcher;
  #allowH2?: boolean;
  #bodyTimeout?: number;
  #connections?: null | number;
  #connectTimeout?: number;
  #headersTimeout?: number;
  #keepAliveTimeout?: number;
  #localAddress?: string;
  #maxConcurrentStreams?: number;
  #maxResponseSize?: number;
  #pipelining?: number;

  private constructor(create: (options: DispatcherConfigType) => UndiciDispatcher) {
    this.#create = create;
  }

  withAllowH2(value: boolean): this {
    this.#allowH2 = value;
    return this;
  }

  withBodyTimeout(value: number): this {
    this.#bodyTimeout = value;
    return this;
  }

  withConnections(value: null | number): this {
    this.#connections = value;
    return this;
  }

  withConnectTimeout(value: number): this {
    this.#connectTimeout = value;
    return this;
  }

  withHeadersTimeout(value: number): this {
    this.#headersTimeout = value;
    return this;
  }

  withKeepAliveTimeout(value: number): this {
    this.#keepAliveTimeout = value;
    return this;
  }

  withLocalAddress(value: string): this {
    this.#localAddress = value;
    return this;
  }

  withMaxConcurrentStreams(value: number): this {
    this.#maxConcurrentStreams = value;
    return this;
  }

  withMaxResponseSize(value: number): this {
    this.#maxResponseSize = value;
    return this;
  }

  withPipelining(value: number): this {
    this.#pipelining = value;
    return this;
  }

  build(): UndiciDispatcher {
    const config: DispatcherConfigType = {};

    if (this.#allowH2 !== undefined) {
      config.allowH2 = this.#allowH2;
    }
    if (this.#bodyTimeout !== undefined) {
      config.bodyTimeout = this.#bodyTimeout;
    }
    if (this.#connections !== undefined) {
      config.connections = this.#connections;
    }
    if (this.#connectTimeout !== undefined) {
      config.connectTimeout = this.#connectTimeout;
    }
    if (this.#headersTimeout !== undefined) {
      config.headersTimeout = this.#headersTimeout;
    }
    if (this.#keepAliveTimeout !== undefined) {
      config.keepAliveTimeout = this.#keepAliveTimeout;
    }
    if (this.#localAddress !== undefined) {
      config.localAddress = this.#localAddress;
    }
    if (this.#maxConcurrentStreams !== undefined) {
      config.maxConcurrentStreams = this.#maxConcurrentStreams;
    }
    if (this.#maxResponseSize !== undefined) {
      config.maxResponseSize = this.#maxResponseSize;
    }
    if (this.#pipelining !== undefined) {
      config.pipelining = this.#pipelining;
    }

    return this.#create(config);
  }
}
