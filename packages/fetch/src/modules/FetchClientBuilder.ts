/**
 * Fluent builder for FetchClient
 */

import type { ClientConfigType } from '../interfaces/ClientConfigType.js';
import type { DispatcherConfigType } from '../interfaces/DispatcherConfigType.js';
import type { QueryParamsType } from '../types/QueryParamsType.js';
import type { RequestInterceptorType } from '../types/RequestInterceptorType.js';
import type { ResponseInterceptorType } from '../types/ResponseInterceptorType.js';
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
  #dispatcher?: DispatcherConfigType;
  #headers?: Record<string, string>;
  #metadata?: Record<string, unknown>;
  #name?: string;
  #params?: QueryParamsType;
  #requestIdGenerator?: () => string;
  #requestInterceptor?: RequestInterceptorType | readonly RequestInterceptorType[];
  #responseInterceptor?: ResponseInterceptorType | readonly ResponseInterceptorType[];
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

  withDispatcher(value: DispatcherConfigType): this {
    this.#dispatcher = value;
    return this;
  }

  withHeaders(value: Record<string, string>): this {
    this.#headers = value;
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

  withParams(value: QueryParamsType): this {
    this.#params = value;
    return this;
  }

  withRequestIdGenerator(value: () => string): this {
    this.#requestIdGenerator = value;
    return this;
  }

  withRequestInterceptor(value: RequestInterceptorType | readonly RequestInterceptorType[]): this {
    this.#requestInterceptor = value;
    return this;
  }

  withResponseInterceptor(value: ResponseInterceptorType | readonly ResponseInterceptorType[]): this {
    this.#responseInterceptor = value;
    return this;
  }

  withTimeout(value: number): this {
    this.#timeout = value;
    return this;
  }

  build(): FetchClient {
    const config: ClientConfigType = {};

    if (this.#autoGenerateRequestId !== undefined) {
      config.autoGenerateRequestId = this.#autoGenerateRequestId;
    }
    if (this.#baseURL !== undefined) {
      config.baseURL = this.#baseURL;
    }
    if (this.#dispatcher !== undefined) {
      config.dispatcher = this.#dispatcher;
    }
    if (this.#headers !== undefined) {
      config.headers = this.#headers;
    }
    if (this.#metadata !== undefined) {
      config.metadata = this.#metadata;
    }
    if (this.#name !== undefined) {
      config.name = this.#name;
    }
    if (this.#params !== undefined) {
      config.params = this.#params;
    }
    if (this.#requestIdGenerator !== undefined) {
      config.requestIdGenerator = this.#requestIdGenerator;
    }
    if (this.#requestInterceptor !== undefined) {
      config.requestInterceptor = this.#requestInterceptor;
    }
    if (this.#responseInterceptor !== undefined) {
      config.responseInterceptor = this.#responseInterceptor;
    }
    if (this.#timeout !== undefined) {
      config.timeout = this.#timeout;
    }

    return this.#create(config);
  }
}
