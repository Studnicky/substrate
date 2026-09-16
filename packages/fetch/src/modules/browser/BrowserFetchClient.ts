import { Signal } from '@studnicky/signal/browser';

import type { DestroyOptionsEntity } from '../../entities/DestroyOptionsEntity.js';
import type { QueryParametersEntity } from '../../entities/QueryParametersEntity.js';
import type { BodyRequestOptionsInterface } from '../../interfaces/BodyRequestOptionsInterface.js';
import type { ClientConfigInterface } from '../../interfaces/ClientConfigInterface.js';
import type { FetchClientInterface } from '../../interfaces/FetchClientInterface.js';
import type { FetchOptionsInterface } from '../../interfaces/FetchOptionsInterface.js';

import { ConfigurationError, TimeoutError } from '../../errors/index.js';
import { BodySerializer } from '../BodySerializer.js';
import { FetchClientConfiguration } from '../FetchClientConfiguration.js';
import { UrlQueryString } from '../UrlQueryString.js';
import { FetchTransport } from './FetchTransport.js';

/** Browser-native HTTP client that uses the platform `fetch` implementation. */
export class BrowserFetchClient implements FetchClientInterface {
  readonly #config: ClientConfigInterface;
  readonly #queryParameters: QueryParametersEntity.Type | undefined;
  readonly #signal: Signal;

  protected constructor(config: ClientConfigInterface) {
    const validated = FetchClientConfiguration.intake(config);

    if (validated.config.dispatcher !== undefined) {
      throw new ConfigurationError('undici connection pooling requires a Node.js runtime; the browser uses native fetch');
    }
    if (validated.config.signal !== undefined && !(validated.config.signal instanceof Signal)) {
      throw new ConfigurationError('signal must be a Signal instance');
    }
    if (validated.config.clock !== undefined && (typeof validated.config.clock.hrtime !== 'function' || typeof validated.config.clock.now !== 'function')) {
      throw new ConfigurationError('clock must implement ClockProviderInterface');
    }

    this.#config = validated.config;
    this.#queryParameters = validated.queryParameters;
    this.#signal = validated.config.signal instanceof Signal ? validated.config.signal : Signal.create();
  }

  public static create(config: ClientConfigInterface = {}): BrowserFetchClient {
    return new BrowserFetchClient(config);
  }

  public async delete(path: string, options?: FetchOptionsInterface): Promise<Response> {
    return await this.#request(path, { ...options, 'method': 'DELETE' });
  }

  public async destroy(_options?: DestroyOptionsEntity.Type): Promise<void> {}

  public async get(path: string, options?: FetchOptionsInterface): Promise<Response> {
    return await this.#request(path, { ...options, 'method': 'GET' });
  }

  public async head(path: string, options?: FetchOptionsInterface): Promise<Response> {
    return await this.#request(path, { ...options, 'method': 'HEAD' });
  }

  public async options(path: string, options?: FetchOptionsInterface): Promise<Response> {
    return await this.#request(path, { ...options, 'method': 'OPTIONS' });
  }

  public async patch(path: string, options?: BodyRequestOptionsInterface): Promise<Response> {
    return await this.#request(path, this.#prepareBodyRequest('PATCH', options));
  }

  public async post(path: string, options?: BodyRequestOptionsInterface): Promise<Response> {
    return await this.#request(path, this.#prepareBodyRequest('POST', options));
  }

  public async put(path: string, options?: BodyRequestOptionsInterface): Promise<Response> {
    return await this.#request(path, this.#prepareBodyRequest('PUT', options));
  }

  #buildUrl(path: string): string {
    if (path === '') {
      throw new ConfigurationError('url must be a non-empty string');
    }

    if (this.#config.baseURL === undefined || path.startsWith('http://') || path.startsWith('https://')) {
      const resolvedUrl = this.#queryParameters === undefined ? path : UrlQueryString.buildUrlFromEntity(path, this.#queryParameters);
      return resolvedUrl;
    }

    const base = this.#config.baseURL.endsWith('/') ? this.#config.baseURL.slice(0, -1) : this.#config.baseURL;
    const suffix = path.startsWith('/') ? path : `/${path}`;

    const url = base + suffix;
    const resolvedUrl = this.#queryParameters === undefined ? url : UrlQueryString.buildUrlFromEntity(url, this.#queryParameters);
    return resolvedUrl;
  }

  #mergeOptions(options: FetchOptionsInterface): FetchOptionsInterface {
    const configured = this.#config.options ?? {};
    const dispatcher = options.dispatcher ?? configured.dispatcher;
    if (dispatcher !== undefined) {
      throw new ConfigurationError('undici connection pooling requires a Node.js runtime; the browser uses native fetch');
    }

    const timeout = options.timeout ?? configured.timeout ?? this.#config.timeout;
    if (timeout !== undefined && (typeof timeout !== 'number' || !Number.isFinite(timeout) || timeout <= 0 || !Number.isInteger(timeout))) {
      throw new ConfigurationError('timeout must be a positive number and integer');
    }

    return {
      ...configured,
      ...options,
      'headers': {
        ...this.#config.headers,
        ...configured.headers,
        ...options.headers
      },
      ...(timeout === undefined ? {} : { 'timeout': timeout })
    };
  }

  #prepareBodyRequest(method: 'PATCH' | 'POST' | 'PUT', options?: BodyRequestOptionsInterface): FetchOptionsInterface {
    const { body, json, ...rest } = options ?? {};
    const effectiveBody = body ?? json;
    const serialized = BodySerializer.serialize(effectiveBody);
    const result: FetchOptionsInterface = { ...rest, 'method': method };

    if (serialized !== undefined) {
      result.body = serialized;
      if (json !== undefined || BodySerializer.needsJsonContentType(effectiveBody)) {
        result.headers = { ...result.headers, 'Content-Type': result.headers?.['Content-Type'] ?? 'application/json' };
      }
    }

    return result;
  }

  async #request(path: string, options: FetchOptionsInterface): Promise<Response> {
    const url = this.#buildUrl(path);
    const merged = this.#mergeOptions(options);
    const {
      'dispatcher': _dispatcher,
      'json': _json,
      'metadata': _metadata,
      'requestId': _requestId,
      'signal': externalSignal,
      timeout,
      ...requestInit
    } = merged;
    const init: Record<string, unknown> = { ...requestInit };
    let requestSignal: AbortSignal | undefined;

    const normalizedSignal = externalSignal ?? undefined;
    if (timeout !== undefined || normalizedSignal !== undefined) {
      const composeOptions: { 'deadlineMs'?: number; 'signal'?: AbortSignal; } = {};
      if (timeout !== undefined) {
        composeOptions.deadlineMs = timeout;
      }
      if (normalizedSignal !== undefined) {
        composeOptions.signal = normalizedSignal;
      }
      requestSignal = await this.#signal.compose(composeOptions);
      init.signal = requestSignal;
    }

    try {
      return await FetchTransport.fetch(url, init);
    } catch (error) {
      if (requestSignal?.aborted === true && timeout !== undefined && externalSignal?.aborted !== true) {
        throw new TimeoutError(url, timeout);
      }

      throw error;
    }
  }
}
