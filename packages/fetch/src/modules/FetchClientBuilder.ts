/**
 * Fluent builder for FetchClient
 */

import { PickDefined } from '@studnicky/types';

import type { DispatcherConfigEntity } from '../entities/DispatcherConfigEntity.js';
import type { ClientConfigType } from '../types/ClientConfigType.js';
import type { FetchOptionsType } from '../types/FetchOptionsType.js';
import type { QueryParamsType } from '../types/QueryParamsType.js';
import type { FetchClient } from './FetchClient.js';

/**
 * Fluent builder for constructing FetchClient instances
 */
export class FetchClientBuilder {
  static create(create: (options: ClientConfigType) => FetchClient): FetchClientBuilder {
    return new FetchClientBuilder(create);
  }

  readonly #create: (options: ClientConfigType) => FetchClient;
  #autoGenerateRequestId?: boolean;
  #baseURL?: string;
  #dispatcher?: DispatcherConfigEntity.Type;
  #headers?: Record<string, string>;
  #hookTimeoutMs?: number;
  #metadata?: Record<string, unknown>;
  #name?: string;
  #options?: FetchOptionsType;
  #params?: QueryParamsType;
  #requestIdGenerator?: () => string;
  #timeout?: number;

  private constructor(create: (options: ClientConfigType) => FetchClient) {
    this.#create = create;
  }

  withAutoGenerateRequestId(value: boolean): this {
    this.#autoGenerateRequestId = value;
    return this;
  }

  withBaseURL(value: string): this {
    this.#baseURL = value;
    return this;
  }

  withDispatcher(value: DispatcherConfigEntity.Type): this {
    this.#dispatcher = value;
    return this;
  }

  withHeaders(value: Record<string, string>): this {
    this.#headers = value;
    return this;
  }

  withHookTimeoutMs(value: number): this {
    this.#hookTimeoutMs = value;
    return this;
  }

  withMetadata(value: Record<string, unknown>): this {
    this.#metadata = value;
    return this;
  }

  withName(value: string): this {
    this.#name = value;
    return this;
  }

  withOptions(value: FetchOptionsType): this {
    this.#options = value;
    return this;
  }

  withParams(value: QueryParamsType): this {
    this.#params = value;
    return this;
  }

  withRequestIdGenerator(value: () => string): this {
    this.#requestIdGenerator = value;
    return this;
  }

  withTimeout(value: number): this {
    this.#timeout = value;
    return this;
  }

  build(): FetchClient {
    const config: ClientConfigType = PickDefined.from({
      'autoGenerateRequestId': this.#autoGenerateRequestId,
      'baseURL': this.#baseURL,
      'dispatcher': this.#dispatcher,
      'headers': this.#headers,
      'hookTimeoutMs': this.#hookTimeoutMs,
      'metadata': this.#metadata,
      'name': this.#name,
      'options': this.#options,
      'params': this.#params,
      'requestIdGenerator': this.#requestIdGenerator,
      'timeout': this.#timeout
    });

    return this.#create(config);
  }
}
