/**
 * Configured HTTP client with subclass-overridable lifecycle hooks
 */

import type { Agent } from 'undici';

import { HookInvoker } from '@studnicky/errors';
import { Clone, SchemaIntakeError } from '@studnicky/json';
import { Predicates } from '@studnicky/types';

import type { DestroyOptionsEntity } from '../entities/DestroyOptionsEntity.js';
import type { RequestMetadataEntity } from '../entities/RequestMetadataEntity.js';
import type { BodyRequestOptionsInterface } from '../interfaces/BodyRequestOptionsInterface.js';
import type { ClientConfigInterface } from '../interfaces/ClientConfigInterface.js';
import type { FetchClientInterface } from '../interfaces/FetchClientInterface.js';
import type { FetchOptionsInterface } from '../interfaces/FetchOptionsInterface.js';
import type { RequestContextInterface } from '../interfaces/RequestContextInterface.js';
import type { RequestIdGeneratorInterface } from '../interfaces/RequestIdGeneratorInterface.js';
import type { ResponseContextInterface } from '../interfaces/ResponseContextInterface.js';
import type { TestDispatcher } from '../testing/TestDispatcher.js';

import { DispatcherAgent } from '../config/DispatcherAgent.js';
import { ClientConfigDataEntity } from '../entities/ClientConfigDataEntity.js';
import {
  AbortError,
  BodyTimeoutError,
  ConfigurationError,
  ConnectTimeoutError,
  HeadersTimeoutError,
  SocketError,
  SocketExhaustionError,
  TimeoutError
} from '../errors/index.js';
import { BodySerializer } from './BodySerializer.js';
import { FetchTransport } from './FetchTransport.js';
import { UndiciDispatcher } from './UndiciDispatcher.js';
import { UrlQueryString } from './UrlQueryString.js';

/**
 * Undici error code to custom error class dispatch map
 */
const UNDICI_ERROR_MAP = new Map<string, 'body' | 'connect' | 'headers' | 'socket'>([
  ['UND_ERR_BODY_TIMEOUT', 'body'],
  ['UND_ERR_CONNECT_TIMEOUT', 'connect'],
  ['UND_ERR_HEADERS_TIMEOUT', 'headers'],
  ['UND_ERR_SOCKET', 'socket']
]);

interface FetchClientSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class FetchClientInstance {
  static belongsTo<TInstance>(
    constructor: FetchClientSubclassInterface<TInstance>,
    value: TInstance | object
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

/**
 * HTTP client with default configuration and subclass-overridable lifecycle hooks.
 *
 * Extend this class and override `onRequest` and/or `onResponse` to transform
 * the outgoing request context (url, options, metadata) or the incoming response
 * context before the final Response is returned to the caller.
 *
 * @example Subclass with request and response transformation
 * ```typescript
 * class AuthClient extends FetchClient {
 *   protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
 *     return {
 *       ...context,
 *       options: {
 *         ...context.options,
 *         headers: { ...context.options.headers, Authorization: `Bearer ${getToken()}` }
 *       }
 *     };
 *   }
 *
 *   protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
 *     if (!context.response.ok) throw new Error(`Request failed: ${context.response.status}`);
 *     return context;
 *   }
 * }
 * ```
 */
export class FetchClient implements FetchClientInterface {
  /**
   * Creates a new configured HTTP client
   *
   * @param config - Client configuration
   * @returns New instance of the class `create()` was called on
   */
  static create<TInstance extends FetchClient = FetchClient>(
    this: FetchClientSubclassInterface<TInstance>,
    config: ClientConfigInterface = {}
  ): TInstance {
    const result = Reflect.construct(this, [config]) as object;
    if (!FetchClientInstance.belongsTo(this, result)) {
      throw new TypeError('FetchClient.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected readonly hooks: HookInvoker;

  private readonly config: ClientConfigInterface;
  private readonly dispatcher: undefined | UndiciDispatcher;
  private readonly dispatcherAgent: Agent | TestDispatcher | undefined;

  protected constructor(config: ClientConfigInterface = {}) {
    const validated = FetchClient.validateConfig(config);

    this.config = validated;
    this.hooks = validated.hookTimeoutMs === undefined
      ? new HookInvoker()
      : new HookInvoker({ 'timeoutMs': validated.hookTimeoutMs });

    const dispatcherAgent = validated.dispatcher?.enabled === true
      ? DispatcherAgent.create(validated.dispatcher)
      : undefined;
    this.dispatcherAgent = dispatcherAgent;
    this.dispatcher = dispatcherAgent === undefined
      ? undefined
      : UndiciDispatcher.create(dispatcherAgent);
  }

  /**
   * Builds full URL from base URL and path
   */
  private buildFullUrl(path: string): string {
    if (this.config.baseURL === undefined) {
      const result: string = this.config.parameters === undefined ? path : UrlQueryString.buildUrl(path, this.config.parameters);
      return result;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const base = this.config.baseURL.endsWith('/')
      ? this.config.baseURL.slice(0, -1)
      : this.config.baseURL;

    const pathPart = path.startsWith('/') ? path : `/${path}`;

    let url = `${base}${pathPart}`;

    if (this.config.parameters !== undefined) {
      url = UrlQueryString.buildUrl(url, this.config.parameters);
    }

    return url;
  }

  /**
   * Creates request metadata from config and options
   */
  private createRequestMetadata(
    path: string,
    method: string,
    options: FetchOptionsInterface
  ): RequestMetadataEntity.Type {
    const autoGenerateRequestId = this.config.autoGenerateRequestId ?? true;
    let requestId = options.requestId ?? '';

    if (requestId === '' && autoGenerateRequestId) {
      requestId = this.config.requestIdGenerator !== undefined
        ? this.config.requestIdGenerator()
        : globalThis.crypto.randomUUID();
    }

    return {
      'metadata': {
        ...this.config.metadata,
        ...options.metadata
      },
      'method': method,
      'path': path,
      'requestId': requestId
    };
  }

  /**
   * Performs a DELETE request
   *
   * @param path - Request path (relative to baseURL)
   * @param options - Request options
   * @returns Response promise
   */
  async delete(path: string, options?: FetchOptionsInterface): Promise<Response> {
    const result = this.fetch(path, {
      ...options,
      'method': 'DELETE'
    });
    return await result;
  }

  /**
   * Destroys the undici dispatcher and cleans up resources
   *
   * This method cancels all in-flight requests by aborting the dispatcher's
   * AbortController, then closes all connections in the pool.
   *
   * Call this when the client is no longer needed to properly close connections.
   *
   * @param options - Optional destroy configuration
   * @param options.timeout - Time in milliseconds to wait before aborting requests
   *   - `undefined` or `0`: Abort immediately (default)
   *   - `> 0`: Wait up to this duration for requests to complete, then abort remaining
   *
   * @example Immediate abort (default)
   * ```typescript
   * const client = FetchClient.create({
   *   dispatcher: { enabled: true, connections: 20 }
   * });
   *
   * // Use the client...
   * await client.get('/api/data');
   *
   * // Clean up when done - cancels any in-flight requests immediately
   * await client.destroy();
   * ```
   *
   * @example Graceful shutdown with timeout
   * ```typescript
   * // Wait up to 5 seconds for requests to complete
   * await client.destroy({ timeout: 5000 });
   * ```
   */
  async destroy(options?: DestroyOptionsEntity.Type): Promise<void> {
    if (this.dispatcher !== undefined) {
      await this.hooks.invokeAsync('onDispatcherDestroy', () => {
        const result = this.onDispatcherDestroy();
        return result;
      });
      await this.dispatcher.destroy(options);
    }
  }

  /**
   * Executes the HTTP request with error handling
   */
  private async executeRequest(
    requestContext: RequestContextInterface,
    method: string,
    requestId: string
  ): Promise<Response> {
    const startTime = Date.now();
    let timeoutMs: number | undefined;
    let timeoutController: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      if (!Predicates.isString(requestContext.url) || requestContext.url === '') {
        throw new ConfigurationError('url must be a non-empty string');
      }

      const {
        dispatcher,
        'json': _json,
        'metadata': _metadata,
        'requestId': _requestId,
        'signal': externalSignal,
        timeout,
        ...standardOptions
      } = requestContext.options;

      if (timeout !== undefined && (!Predicates.isNumberType(timeout) || timeout <= 0 || !Number.isFinite(timeout))) {
        throw new ConfigurationError('timeout must be a positive number');
      }

      let signal = externalSignal;

      if (timeout !== undefined) {
        timeoutMs = timeout;
        timeoutController = new AbortController();
        timeoutId = setTimeout(() => {
          timeoutController?.abort(new TimeoutError(requestContext.url, timeout));
        }, timeout);
        signal = externalSignal === undefined
          ? timeoutController.signal
          : AbortSignal.any([timeoutController.signal, externalSignal]);
      }

      const requestInit: Record<string, unknown> = signal === undefined
        ? { ...standardOptions }
        : { ...standardOptions, 'signal': signal };

      if (dispatcher !== undefined) {
        requestInit.dispatcher = dispatcher;
      }

      const response = await FetchTransport.fetch(requestContext.url, requestInit);

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      const duration = Date.now() - startTime;

      if (response.ok) {
        await this.hooks.invokeAsync('onResponseSuccess', () => {
          const result = this.onResponseSuccess(method, requestId, response.status, duration);
          return result;
        });
      } else {
        await this.hooks.invokeAsync('onResponseError', () => {
          const result = this.onResponseError(method, requestId, response.status, duration);
          return result;
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      let requestError = error;

      if (
        !(error instanceof TimeoutError)
        && !(error instanceof AbortError)
        && (error instanceof Error || error instanceof DOMException)
        && error.name === 'AbortError'
      ) {
        requestError = timeoutController?.signal.aborted === true && timeoutMs !== undefined
          ? new TimeoutError(requestContext.url, timeoutMs)
          : new AbortError(requestContext.url, error.message);
      }

      const hookError = Predicates.isError(requestError) ? requestError : new Error(String(requestError));

      if (requestError instanceof TimeoutError) {
        await this.hooks.invokeAsync('onTimeout', () => {
          const result = this.onTimeout(method, requestId, requestContext.url, requestError.timeoutMs);
          return result;
        });
        await this.hooks.invokeAsync('onRequestError', () => {
          const result = this.onRequestError(hookError, method, requestId, requestContext.url, duration);
          return result;
        });
        throw requestError;
      }

      if (requestError instanceof AbortError) {
        await this.hooks.invokeAsync('onAbort', () => {
          const result = this.onAbort(method, requestId, requestContext.url);
          return result;
        });
        await this.hooks.invokeAsync('onRequestError', () => {
          const result = this.onRequestError(hookError, method, requestId, requestContext.url, duration);
          return result;
        });
        throw requestError;
      }

      if (Predicates.isError(requestError)) {
        const wrappedError = await this.wrapUndiciError(requestError, requestContext.url, method, requestId, duration);

        if (wrappedError !== undefined) {
          throw wrappedError;
        }
      }

      await this.hooks.invokeAsync('onRequestError', () => {
        const result = this.onRequestError(hookError, method, requestId, requestContext.url, duration);
        return result;
      });
      throw requestError;
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Extracts the origin from a URL for dispatcher stats lookup
   * Format: protocol://hostname:port (e.g., "https://api.example.com:443")
   *
   * @param url - Full URL to extract origin from
   * @returns Origin string or undefined if URL is invalid
   */
  private extractOrigin(url: string): string | undefined {
    try {
      const urlObject = new URL(url);

      return urlObject.origin;
    } catch {
      return undefined;
    }
  }

  /**
   * Internal fetch method that applies configuration and lifecycle hooks
   */
  private async fetch(path: string, options: FetchOptionsInterface = {}): Promise<Response> {
    if (!Predicates.isString(path) || path === '') {
      throw new ConfigurationError('url must be a non-empty string');
    }

    const method = options.method ?? 'GET';
    const metadata = this.createRequestMetadata(path, method, options);
    const url = this.buildFullUrl(path);

    await this.hooks.invokeAsync('onRequestStart', () => {
      const result = this.onRequestStart(method, path, metadata.requestId, url);
      return result;
    });

    const requestContext = await this.onRequest({
      'metadata': metadata,
      'options': this.mergeOptions(options),
      'url': url
    });

    const response = await this.executeRequest(requestContext, method, metadata.requestId);

    const responseContext = await this.onResponse({
      'request': requestContext.metadata,
      'response': response
    });

    return responseContext.response;
  }

  /**
   * Performs a GET request
   *
   * @param path - Request path (relative to baseURL)
   * @param options - Request options
   * @returns Response promise
   */
  async get(path: string, options?: FetchOptionsInterface): Promise<Response> {
    const result = this.fetch(path, {
      ...options,
      'method': 'GET'
    });
    return await result;
  }

  /**
   * Handles socket exhaustion error when dispatcher is enabled
   * @returns Error to throw, or undefined if not a socket exhaustion case
   */
  private async handleSocketExhaustion(
    url: string,
    errorCode: string,
    method: string,
    requestId: string,
    duration: number
  ): Promise<Error | undefined> {
    if (this.dispatcher === undefined) {
      return undefined;
    }

    const origin = this.extractOrigin(url);

    if (origin === undefined) {
      return undefined;
    }

    const stats = this.dispatcher.checkDispatcherHealth(origin).stats;

    await this.hooks.invokeAsync('onRequestError', () => {
      const result = this.onRequestError(
        new Error(`Connection pool exhaustion: ${errorCode}`),
        method,
        requestId,
        url,
        duration
      );
      return result;
    });

    return new SocketExhaustionError(url, stats);
  }

  /**
   * Performs a HEAD request
   *
   * @param path - Request path (relative to baseURL)
   * @param options - Request options
   * @returns Response promise
   */
  async head(path: string, options?: FetchOptionsInterface): Promise<Response> {
    const result = this.fetch(path, {
      ...options,
      'method': 'HEAD'
    });
    return await result;
  }

  /**
   * Override to transform the outgoing request context before the HTTP call.
   *
   * Return the context unchanged for a no-op (default behaviour).
   * Mutate or replace `url`, `options`, or `metadata` to alter the request.
   *
   * @param context - Request context containing url, options, and metadata
   * @returns Transformed (or unchanged) request context
   *
   * @example
   * ```typescript
   * protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
   *   return {
   *     ...context,
   *     options: {
   *       ...context.options,
   *       headers: { ...context.options.headers, Authorization: `Bearer ${getToken()}` }
   *     }
   *   };
   * }
   * ```
   */
  protected onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    const result: RequestContextInterface = context;
    const response = Promise.resolve(result);
    return response;
  }

  /**
   * Override to transform the response context after the HTTP call returns.
   *
   * Return the context unchanged for a no-op (default behaviour).
   * Replace `response` to transform what the caller receives.
   * Throw from this method to reject the request with a custom error.
   *
   * @param context - Response context containing the HTTP response and request metadata
   * @returns Transformed (or unchanged) response context
   *
   * @example
   * ```typescript
   * protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
   *   if (!context.response.ok) throw new Error(`HTTP ${context.response.status}`);
   *   return context;
   * }
   * ```
   */
  protected onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    const result: ResponseContextInterface = context;
    const response = Promise.resolve(result);
    return response;
  }

  /** Fires when a request is about to start. */
  protected onRequestStart(
    _method: string,
    _path: string,
    _requestId: string,
    _url: string
  ): void {}

  /** Fires when an HTTP request fails. */
  protected onRequestError(
    _error: Error,
    _method: string,
    _requestId: string,
    _url: string,
    _durationMs: number
  ): void {}

  /** Fires when an HTTP response is successfully received. */
  protected onResponseSuccess(
    _method: string,
    _requestId: string,
    _statusCode: number,
    _durationMs: number
  ): void {}

  /** Fires when an HTTP response with non-2xx status is received. */
  protected onResponseError(
    _method: string,
    _requestId: string,
    _statusCode: number,
    _durationMs: number
  ): void {}

  /** Fires when a request is aborted by a timeout. */
  protected onTimeout(
    _method: string,
    _requestId: string,
    _url: string,
    _timeoutMs: number
  ): void {}

  /** Fires when a request is aborted by the caller. */
  protected onAbort(
    _method: string,
    _requestId: string,
    _url: string
  ): void {}

  /** Fires when the client's dispatcher is about to be destroyed. */
  protected onDispatcherDestroy(): void {}

  /**
   * Merges headers from config and request options
   *
   * V8 Optimization: Fast paths minimize allocations for common cases:
   * - No headers: 0 allocations (return empty object)
   * - Only config headers: 1 allocation
   * - Only request headers: 1 allocation
   * - Both headers: 1 allocation
   */
  private mergeHeaders(requestHeaders?: Record<string, string>): Record<string, string> {
    return {
      ...this.config.options?.headers,
      ...this.config.headers,
      ...requestHeaders
    };
  }

  /**
   * Merges config options with request options
   *
   * Request values override client defaults, and an active client dispatcher
   * is used only when neither layer provides one.
   */
  private mergeOptions(options: FetchOptionsInterface): FetchOptionsInterface {
    const timeout = options.timeout ?? this.config.timeout;
    const dispatcher = options.dispatcher ?? this.config.options?.dispatcher ?? this.dispatcherAgent;

    const merged: FetchOptionsInterface = {
      ...this.config.options,
      ...options,
      'headers': this.mergeHeaders(options.headers),
      ...(dispatcher === undefined ? {} : { 'dispatcher': dispatcher }),
      ...(timeout === undefined ? {} : { 'timeout': timeout })
    };

    return merged;
  }

  /**
   * Performs an OPTIONS request
   *
   * @param path - Request path (relative to baseURL)
   * @param options - Request options
   * @returns Response promise
   */
  async options(path: string, options?: FetchOptionsInterface): Promise<Response> {
    const result = this.fetch(path, {
      ...options,
      'method': 'OPTIONS'
    });
    return await result;
  }

  /**
   * Performs a PATCH request
   *
   * @param path - Request path (relative to baseURL)
   * @param options - Request options including optional body (auto-serialized to JSON if object/array; raw string/Buffer sent as-is)
   * @returns Response promise
   */
  async patch(path: string, options?: BodyRequestOptionsInterface): Promise<Response> {
    const result = this.fetch(path, this.prepareBodyRequest('PATCH', options));
    return await result;
  }

  /**
   * Performs a POST request
   *
   * @param path - Request path (relative to baseURL)
   * @param options - Request options including optional body (auto-serialized to JSON if object/array; raw string/Buffer sent as-is)
   * @returns Response promise
   */
  async post(path: string, options?: BodyRequestOptionsInterface): Promise<Response> {
    const result = this.fetch(path, this.prepareBodyRequest('POST', options));
    return await result;
  }

  /**
   * Prepares fetch options for requests with a body (POST, PUT, PATCH)
   * Handles json serialization and Content-Type header injection
   */
  private prepareBodyRequest(
    method: 'PATCH' | 'POST' | 'PUT',
    options?: BodyRequestOptionsInterface
  ): FetchOptionsInterface {
    const {
      body, json, ...restOptions
    } = options ?? {};
    const effectiveBody = body !== undefined ? body : json;
    const serializedBody = BodySerializer.serialize(effectiveBody);
    const fetchOptions: FetchOptionsInterface = { ...restOptions, 'method': method };

    if (serializedBody !== undefined) {
      fetchOptions.body = serializedBody;

      if (json !== undefined || BodySerializer.needsJsonContentType(effectiveBody)) {
        const headers: Record<string, string> = fetchOptions.headers ?? {};

        headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
        fetchOptions.headers = headers;
      }
    }

    return fetchOptions;
  }

  /**
   * Performs a PUT request
   *
   * @param path - Request path (relative to baseURL)
   * @param options - Request options including optional body (auto-serialized to JSON if object/array; raw string/Buffer sent as-is)
   * @returns Response promise
   */
  async put(path: string, options?: BodyRequestOptionsInterface): Promise<Response> {
    const result = this.fetch(path, this.prepareBodyRequest('PUT', options));
    return await result;
  }

  /**
   * Wraps undici errors with custom error classes
   * @returns Custom error if recognized, undefined otherwise
   */
  private async wrapUndiciError(
    error: Error,
    url: string,
    method: string,
    requestId: string,
    duration: number
  ): Promise<Error | undefined> {
    if (!('code' in error) || !Predicates.isString(error.code)) {
      return undefined;
    }
    const errorCode = error.code;

    const errorType = UNDICI_ERROR_MAP.get(errorCode);

    if (errorType === undefined) {
      return undefined;
    }

    if (errorType === 'connect') {
      const exhaustionError = await this.handleSocketExhaustion(url, errorCode, method, requestId, duration);

      if (exhaustionError !== undefined) {
        return exhaustionError;
      }

      return new ConnectTimeoutError(url, error);
    }

    if (errorType === 'socket') {
      return new SocketError(url, error);
    }

    if (errorType === 'headers') {
      return new HeadersTimeoutError(url, error);
    }

    return new BodyTimeoutError(url, error);
  }

  private static validateConfig(config: ClientConfigInterface): ClientConfigInterface {
    if (!Predicates.isRecord(config)) {
      throw new ConfigurationError('config must be an object');
    }

    const {
      'options': configuredOptions,
      requestIdGenerator,
      ...configData
    } = config;
    const intakeData: object = {};
    const configKeys = Object.keys(configData);
    const configKeyLength = configKeys.length;
    for (let index = 0; index < configKeyLength; index += 1) {
      const key = configKeys[index];
      if (key === undefined) {
        continue;
      }
      const value: unknown = Reflect.get(configData, key);
      if (value !== null) {
        Reflect.set(intakeData, key, value);
      }
    }
    if (!Predicates.isNullish(configData.hookTimeoutMs) && !Predicates.isNumberType(configData.hookTimeoutMs)) {
      throw new ConfigurationError('hookTimeoutMs must be a number');
    }
    if (Predicates.isNumberType(configData.hookTimeoutMs) && configData.hookTimeoutMs <= 0) {
      throw new ConfigurationError('hookTimeoutMs must be positive');
    }
    if (Predicates.isNumberType(configData.hookTimeoutMs) && !Number.isFinite(configData.hookTimeoutMs)) {
      throw new ConfigurationError('hookTimeoutMs must be finite');
    }
    if (!Predicates.isNullish(configData.timeout) && !Predicates.isNumberType(configData.timeout)) {
      throw new ConfigurationError('timeout must be a number');
    }
    if (Predicates.isNumberType(configData.timeout) && configData.timeout <= 0) {
      throw new ConfigurationError('timeout must be positive');
    }
    if (Predicates.isNumberType(configData.timeout) && !Number.isFinite(configData.timeout)) {
      throw new ConfigurationError('timeout must be finite');
    }
    if (!Predicates.isNullish(configuredOptions) && !Predicates.isRecord(configuredOptions)) {
      throw new ConfigurationError('options must be an object');
    }
    const {
      body,
      dispatcher,
      headers,
      json,
      metadata,
      signal,
      ...optionData
    } = configuredOptions ?? {};
    const { 'timeout': optionTimeout, ...optionsWithoutTimeout } = optionData;
    const normalizedOptionData = optionTimeout === null ? optionsWithoutTimeout : optionData;
    if (normalizedOptionData.integrity !== undefined && !Predicates.isString(normalizedOptionData.integrity)) {
      throw new ConfigurationError('integrity must be a string');
    }
    if (normalizedOptionData.referrer !== undefined && !Predicates.isString(normalizedOptionData.referrer)) {
      throw new ConfigurationError('referrer must be a string');
    }
    if (!Predicates.isNullish(optionTimeout) && !Predicates.isNumberType(optionTimeout)) {
      throw new ConfigurationError('timeout must be a number');
    }
    if (!Predicates.isNullish(signal) && !Predicates.isAbortSignal(signal)) {
      throw new ConfigurationError('signal must be an AbortSignal instance');
    }
    const input = Predicates.isNullish(configuredOptions)
      ? intakeData
      : { ...intakeData, 'options': normalizedOptionData };

    let parsed: ClientConfigDataEntity.Type;
    try {
      parsed = ClientConfigDataEntity.intake(input);
    } catch (error) {
      if (error instanceof SchemaIntakeError) {
        throw new ConfigurationError(error.message);
      }
      throw error;
    }

    if (!Predicates.isNullish(requestIdGenerator)) {
      FetchClient.assertRequestIdGenerator(requestIdGenerator);
    }

    const options: FetchOptionsInterface | undefined = parsed.options === undefined
      ? undefined
      : FetchClient.snapshotOptions({
        ...parsed.options,
        ...(body === undefined ? {} : { 'body': body }),
        ...(dispatcher === undefined ? {} : { 'dispatcher': dispatcher }),
        ...(headers === undefined ? {} : { 'headers': headers }),
        ...(json === undefined ? {} : { 'json': json }),
        ...(metadata === undefined ? {} : { 'metadata': metadata }),
        ...(signal === undefined ? {} : { 'signal': signal })
      });
    const result: ClientConfigInterface = {
      ...parsed,
      ...(options === undefined ? {} : { 'options': options }),
      ...(Predicates.isNullish(requestIdGenerator) ? {} : { 'requestIdGenerator': requestIdGenerator })
    };
    return result;
  }

  /** Verifies the injected request-ID collaborator's runtime contract once at construction. */
  private static assertRequestIdGenerator(requestIdGenerator: RequestIdGeneratorInterface): void {
    if (!Predicates.isFunction(requestIdGenerator)) {
      throw new ConfigurationError('requestIdGenerator must be a function');
    }

    try {
      if (!Predicates.isString(requestIdGenerator())) {
        throw new ConfigurationError('requestIdGenerator must return a string');
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(`requestIdGenerator function error: ${Predicates.isError(error) ? error.message : String(error)}`);
    }
  }

  private static snapshotOptions(options: FetchOptionsInterface): FetchOptionsInterface {
    let body = options.body;
    if (options.body instanceof ArrayBuffer) {
      body = options.body.slice(0);
    } else if (options.body instanceof Uint8Array) {
      body = Uint8Array.from(options.body);
    }

    const json = options.json;
    const snapshotJson = Predicates.isObjectLike(json)
      && Object.getPrototypeOf(json) !== Object.prototype
      && Object.getPrototypeOf(json) !== null
      ? json
      : Clone.deep(json);
    const result: FetchOptionsInterface = {
      ...options,
      ...(body === undefined ? {} : { 'body': body }),
      ...(options.headers === undefined ? {} : { 'headers': { ...options.headers } }),
      ...(json === undefined ? {} : { 'json': snapshotJson }),
      ...(options.metadata === undefined ? {} : { 'metadata': Clone.deep(options.metadata) })
    };
    return result;
  }
}
