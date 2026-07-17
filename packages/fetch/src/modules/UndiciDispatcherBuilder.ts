/**
 * Fluent builder for UndiciDispatcher
 */

import { PickDefined } from '@studnicky/types';

import type { DispatcherConfigEntity } from '../entities/DispatcherConfigEntity.js';
import type { UndiciDispatcher } from './UndiciDispatcher.js';

/**
 * Fluent builder for constructing UndiciDispatcher instances
 */
export class UndiciDispatcherBuilder {
  static create(create: (options: DispatcherConfigEntity.Type) => UndiciDispatcher): UndiciDispatcherBuilder {
    return new UndiciDispatcherBuilder(create);
  }

  readonly #create: (options: DispatcherConfigEntity.Type) => UndiciDispatcher;
  #allowH2?: boolean;
  #autoSelectFamily?: boolean;
  #autoSelectFamilyAttemptTimeout?: number;
  #bodyTimeout?: number;
  #clientTtl?: number;
  #connections?: null | number;
  #connectTimeout?: number;
  #headersTimeout?: number;
  #keepAliveMaxTimeout?: number;
  #keepAliveTimeout?: number;
  #keepAliveTimeoutThreshold?: number;
  #localAddress?: string;
  #maxConcurrentStreams?: number;
  #maxHeaderSize?: number;
  #maxOrigins?: number;
  #maxRequestsPerClient?: number;
  #maxResponseSize?: number;
  #pipelining?: number;
  #strictContentLength?: boolean;

  private constructor(create: (options: DispatcherConfigEntity.Type) => UndiciDispatcher) {
    this.#create = create;
  }

  withAllowH2(value: boolean): this {
    this.#allowH2 = value;
    return this;
  }

  withAutoSelectFamily(value: boolean): this {
    this.#autoSelectFamily = value;
    return this;
  }

  withAutoSelectFamilyAttemptTimeout(value: number): this {
    this.#autoSelectFamilyAttemptTimeout = value;
    return this;
  }

  withBodyTimeout(value: number): this {
    this.#bodyTimeout = value;
    return this;
  }

  withClientTtl(value: number): this {
    this.#clientTtl = value;
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

  withKeepAliveMaxTimeout(value: number): this {
    this.#keepAliveMaxTimeout = value;
    return this;
  }

  withKeepAliveTimeout(value: number): this {
    this.#keepAliveTimeout = value;
    return this;
  }

  withKeepAliveTimeoutThreshold(value: number): this {
    this.#keepAliveTimeoutThreshold = value;
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

  withMaxHeaderSize(value: number): this {
    this.#maxHeaderSize = value;
    return this;
  }

  withMaxOrigins(value: number): this {
    this.#maxOrigins = value;
    return this;
  }

  withMaxRequestsPerClient(value: number): this {
    this.#maxRequestsPerClient = value;
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

  withStrictContentLength(value: boolean): this {
    this.#strictContentLength = value;
    return this;
  }

  build(): UndiciDispatcher {
    const config: DispatcherConfigEntity.Type = PickDefined.from({
      'allowH2': this.#allowH2,
      'autoSelectFamily': this.#autoSelectFamily,
      'autoSelectFamilyAttemptTimeout': this.#autoSelectFamilyAttemptTimeout,
      'bodyTimeout': this.#bodyTimeout,
      'clientTtl': this.#clientTtl,
      'connections': this.#connections,
      'connectTimeout': this.#connectTimeout,
      'headersTimeout': this.#headersTimeout,
      'keepAliveMaxTimeout': this.#keepAliveMaxTimeout,
      'keepAliveTimeout': this.#keepAliveTimeout,
      'keepAliveTimeoutThreshold': this.#keepAliveTimeoutThreshold,
      'localAddress': this.#localAddress,
      'maxConcurrentStreams': this.#maxConcurrentStreams,
      'maxHeaderSize': this.#maxHeaderSize,
      'maxOrigins': this.#maxOrigins,
      'maxRequestsPerClient': this.#maxRequestsPerClient,
      'maxResponseSize': this.#maxResponseSize,
      'pipelining': this.#pipelining,
      'strictContentLength': this.#strictContentLength
    });

    return this.#create(config);
  }
}
