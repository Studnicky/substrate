import type { ComposedSignalInterface } from '@studnicky/signal/interfaces';

import type { BaseError} from '#runtime';

import { CallerFault, Signal } from '#runtime';

import type { DestroyOptionsEntity } from '../../entities/DestroyOptionsEntity.js';
import type { QueryParametersEntity } from '../../entities/QueryParametersEntity.js';
import type { BodyRequestOptionsInterface } from '../../interfaces/BodyRequestOptionsInterface.js';
import type { ClientConfigInterface } from '../../interfaces/ClientConfigInterface.js';
import type { FetchClientInterface } from '../../interfaces/FetchClientInterface.js';
import type { FetchOptionsInterface } from '../../interfaces/FetchOptionsInterface.js';
import type { RequestFailureSignalsInterface } from '../../interfaces/RequestFailureSignalsInterface.js';
import type { ResolvedClientConfigInterface } from '../../interfaces/ResolvedClientConfigInterface.js';

import { ConfigurationError } from '../../errors/index.js';
import { BodySerializer } from '../BodySerializer.js';
import { FetchClientConfiguration } from '../FetchClientConfiguration.js';
import { RequestErrorClassifier } from '../RequestErrorClassifier.js';
import { RequestInitEncoder } from '../RequestInitEncoder.js';
import { UrlQueryString } from '../UrlQueryString.js';
import { FetchTransport } from './FetchTransport.js';

interface ComposeBrowserRequestSignalOptionsInterface {
  readonly 'normalizedSignal': AbortSignal | undefined;
  readonly 'timeout': number | undefined;
}

/** Browser-native HTTP client that uses the platform `fetch` implementation. */
export class BrowserFetchClient implements FetchClientInterface {
  readonly #config: ResolvedClientConfigInterface;
  readonly #queryParameters: QueryParametersEntity.Type | undefined;
  readonly #signal: Signal;

  protected constructor(config: ClientConfigInterface) {
    const validated = FetchClientConfiguration.intake(config, FetchClientConfiguration.collaboratorsFrom(config));

    if (validated.config.dispatcher !== undefined) {
      throw new ConfigurationError('undici connection pooling requires a Node.js runtime; the browser uses native fetch');
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

  public async destroy(_options?: DestroyOptionsEntity.InputType): Promise<void> {}

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
    this.#assertNoDispatcher(dispatcher);

    const timeout = options.timeout ?? configured.timeout ?? this.#config.timeout;
    this.#assertValidTimeout(timeout);

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

  #assertNoDispatcher(dispatcher: FetchOptionsInterface['dispatcher']): void {
    if (dispatcher !== undefined) {
      throw new ConfigurationError('undici connection pooling requires a Node.js runtime; the browser uses native fetch');
    }
  }

  #assertValidTimeout(timeout: number | undefined): void {
    if (timeout !== undefined && (typeof timeout !== 'number' || !Number.isFinite(timeout) || timeout <= 0 || !Number.isInteger(timeout))) {
      throw new ConfigurationError('timeout must be a positive number and integer');
    }
  }

  #prepareBodyRequest(method: 'PATCH' | 'POST' | 'PUT', options?: BodyRequestOptionsInterface): FetchOptionsInterface {
    const { body, json, ...rest } = options ?? {};
    const effectiveBody = body ?? json;
    const serialized = BodySerializer.serialize(effectiveBody);
    const result: FetchOptionsInterface = { ...rest, 'method': method };

    if (serialized !== undefined) {
      result.body = serialized;
      if (json !== undefined || BodySerializer.needsJsonContentType(effectiveBody)) {
        const headers: Record<string, string> = result.headers ?? {};
        headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
        result.headers = headers;
      }
    }

    return result;
  }

  async #request(path: string, options: FetchOptionsInterface): Promise<Response> {
    const url = this.#buildUrl(path);
    const merged = this.#mergeOptions(options);
    const encoded = RequestInitEncoder.encode(merged);
    const { 'signal': externalSignal, timeout } = encoded;
    const init: Record<string, unknown> = { ...encoded.requestInit };
    const normalizedSignal = externalSignal ?? undefined;
    const composedSignal = await this.#composeRequestSignal(init, { 'normalizedSignal': normalizedSignal, 'timeout': timeout });
    const requestSignal = composedSignal?.signal;

    try {
      return await FetchTransport.fetch(url, init);
    } catch (error) {
      throw BrowserFetchClient.#toRequestFailure(error, url, { 'externalSignal': externalSignal, 'requestSignal': requestSignal, 'timeoutMs': timeout });
    } finally {
      composedSignal?.dispose();
    }
  }

  /** Abort/timeout reclassification, then a caller-owned abort reason; anything else is wrapped as a named platform failure. */
  static #toRequestFailure(error: unknown, url: string, signals: RequestFailureSignalsInterface): BaseError {
    const classified = RequestErrorClassifier.classifyAbortOrTimeout(RequestErrorClassifier.platformCause(error), url, signals);
    if (RequestErrorClassifier.isCallerAbortReason(classified, signals.externalSignal)) {
      // The caller aborted the request's own signal with this value; it belongs to the caller.
      CallerFault.propagate(classified);
    }
    const result = RequestErrorClassifier.toNamed(classified, url);
    return result;
  }

  /** Composes the deadline/abort signal and writes it onto `init` in place, matching undici's fetch(url, init) contract. */
  async #composeRequestSignal(
    init: Record<string, unknown>,
    options: ComposeBrowserRequestSignalOptionsInterface
  ): Promise<ComposedSignalInterface | undefined> {
    if (options.timeout === undefined && options.normalizedSignal === undefined) {
      return undefined;
    }

    const composeOptions: { 'deadlineMs'?: number; 'signal'?: AbortSignal; } = {};
    if (options.timeout !== undefined) {
      composeOptions.deadlineMs = options.timeout;
    }
    if (options.normalizedSignal !== undefined) {
      composeOptions.signal = options.normalizedSignal;
    }
    const composed = await this.#signal.compose(composeOptions);
    init.signal = composed.signal;
    return composed;
  }
}
