/**
 * Configured HTTP client with subclass-overridable lifecycle hooks
 */

import type { Agent } from 'undici';

import { HookInvoker } from '@studnicky/errors';

import type { DestroyOptionsEntity } from '../entities/DestroyOptionsEntity.js';
import type { RequestMetadataEntity } from '../entities/RequestMetadataEntity.js';
import type { BodyRequestOptionsInterface } from '../interfaces/BodyRequestOptionsInterface.js';
import type { ClientConfigInterface } from '../interfaces/ClientConfigInterface.js';
import type { FetchClientInterface } from '../interfaces/FetchClientInterface.js';
import type { FetchOptionsInterface } from '../interfaces/FetchOptionsInterface.js';
import type { RequestContextInterface } from '../interfaces/RequestContextInterface.js';
import type { ResponseContextInterface } from '../interfaces/ResponseContextInterface.js';
import type { ValidatorFnInterface } from '../interfaces/ValidatorFnInterface.js';

import { DispatcherAgent } from '../config/DispatcherAgent.js';
import {
  ValidateAutoGenerateRequestId,
  validateDispatcher,
  ValidateHeaders,
  ValidateHookTimeoutMs,
  ValidateMetadata,
  ValidateOptions,
  ValidateParams,
  ValidateRequestIdGenerator,
  ValidateTimeout,
  ValidateURL
} from '../config/schemas/index.js';
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
import { UrlUtils } from './UrlUtils.js';

/**
 * Undici error code to custom error class dispatch map
 */
const UNDICI_ERROR_MAP: Record<string, 'body' | 'connect' | 'headers' | 'socket'> = {
  'UND_ERR_BODY_TIMEOUT': 'body',
  'UND_ERR_CONNECT_TIMEOUT': 'connect',
  'UND_ERR_HEADERS_TIMEOUT': 'headers',
  'UND_ERR_SOCKET': 'socket'
};

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
 *   static override create(config = {}): AuthClient {
 *     return new this(config);
 *   }
 *
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
   * @returns New FetchClient instance
   */
  static create(config: ClientConfigInterface = {}): FetchClient {
    return new this(config);
  }

  protected readonly hooks: HookInvoker;

  private readonly config: ClientConfigInterface;
  private readonly dispatcher: undefined | UndiciDispatcher;
  private readonly dispatcherAgent: Agent | undefined;

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
      return this.config.params === undefined ? path : UrlUtils.buildUrl(path, this.config.params);
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const base = this.config.baseURL.endsWith('/')
      ? this.config.baseURL.slice(0, -1)
      : this.config.baseURL;

    const pathPart = path.startsWith('/') ? path : `/${path}`;

    let url = `${base}${pathPart}`;

    if (this.config.params !== undefined) {
      url = UrlUtils.buildUrl(url, this.config.params);
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
      if (typeof requestContext.url !== 'string' || requestContext.url === '') {
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

      if (timeout !== undefined && (typeof timeout !== 'number' || timeout <= 0 || !Number.isFinite(timeout))) {
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

      if (requestError instanceof TimeoutError) {
        await this.hooks.invokeAsync('onTimeout', () => {
          const result = this.onTimeout(method, requestId, requestContext.url, requestError.timeoutMs);
          return result;
        });
        await this.hooks.invokeAsync('onRequestError', () => {
          const result = this.onRequestError(requestError, method, requestId, requestContext.url, duration);
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
          const result = this.onRequestError(requestError, method, requestId, requestContext.url, duration);
          return result;
        });
        throw requestError;
      }

      if (requestError instanceof Error) {
        const wrappedError = await this.wrapUndiciError(requestError, requestContext.url, method, requestId, duration);

        if (wrappedError !== undefined) {
          throw wrappedError;
        }
      }

      await this.hooks.invokeAsync('onRequestError', () => {
        const result = this.onRequestError(requestError, method, requestId, requestContext.url, duration);
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
      const urlObj = new URL(url);

      return urlObj.origin;
    } catch {
      return undefined;
    }
  }

  /**
   * Internal fetch method that applies configuration and lifecycle hooks
   */
  private async fetch(path: string, options: FetchOptionsInterface = {}): Promise<Response> {
    if (typeof path !== 'string' || path === '') {
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
    return Promise.resolve(result);
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
    return Promise.resolve(result);
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
    _error: unknown,
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
    if (!('code' in error) || typeof error.code !== 'string') {
      return undefined;
    }
    const errorCode = error.code;

    const errorType = UNDICI_ERROR_MAP[errorCode];

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

  private static readonly CONFIG_VALIDATORS: Record<string, ValidatorFnInterface> = {
    'autoGenerateRequestId': (value) => { ValidateAutoGenerateRequestId.validate(value); },
    'baseURL': (value) => { ValidateURL.validate(value); },
    'dispatcher': validateDispatcher,
    'headers': ValidateHeaders.validate,
    'hookTimeoutMs': (value) => { ValidateHookTimeoutMs.validate(value); },
    'metadata': ValidateMetadata.validate,
    'options': ValidateOptions.validate,
    'params': (value) => { ValidateParams.validate(value); },
    'requestIdGenerator': (value) => { ValidateRequestIdGenerator.validate(value); },
    'timeout': (value) => { ValidateTimeout.validate(value); }
  };

  private static validateConfig(config: ClientConfigInterface): ClientConfigInterface {
    if (typeof config !== 'object' || Array.isArray(config)) {
      throw new ConfigurationError('config must be an object');
    }

    for (const [key, value] of Object.entries(config)) {
      const validator = FetchClient.CONFIG_VALIDATORS[key];

      if (validator === undefined) {
        throw new ConfigurationError(`"${key}" is not declared in the schema`);
      }

      validator(value);
    }

    return FetchClient.snapshotConfig(config);
  }

  /** Detaches constructor-owned configuration from caller-owned mutable data. */
  private static snapshotConfig(config: ClientConfigInterface): ClientConfigInterface {
    return {
      ...config,
      ...(config.dispatcher === undefined ? {} : { 'dispatcher': { ...config.dispatcher } }),
      ...(config.headers === undefined ? {} : { 'headers': { ...config.headers } }),
      ...(config.metadata === undefined ? {} : { 'metadata': FetchClient.snapshotRecord(config.metadata) }),
      ...(config.options === undefined ? {} : { 'options': FetchClient.snapshotOptions(config.options) }),
      ...(config.params === undefined ? {} : { 'params': FetchClient.snapshotParams(config.params) })
    };
  }

  private static snapshotOptions(options: FetchOptionsInterface): FetchOptionsInterface {
    let body = options.body;
    if (options.body instanceof ArrayBuffer) {
      body = options.body.slice(0);
    } else if (options.body instanceof Uint8Array) {
      body = Uint8Array.from(options.body);
    }

    return {
      ...options,
      ...(body === undefined ? {} : { 'body': body }),
      ...(options.headers === undefined ? {} : { 'headers': { ...options.headers } }),
      ...(options.json === undefined ? {} : { 'json': FetchClient.snapshotValue(options.json) }),
      ...(options.metadata === undefined ? {} : { 'metadata': FetchClient.snapshotRecord(options.metadata) })
    };
  }

  private static snapshotParams(
    params: NonNullable<ClientConfigInterface['params']>
  ): NonNullable<ClientConfigInterface['params']> {
    const snapshot: NonNullable<ClientConfigInterface['params']> = {};

    for (const [key, value] of Object.entries(params)) {
      snapshot[key] = Array.isArray(value) ? [...value] : value;
    }

    return snapshot;
  }

  private static snapshotRecord(record: Record<string, unknown>): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      snapshot[key] = FetchClient.snapshotValue(value);
    }

    return snapshot;
  }

  private static snapshotValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      const snapshot: unknown[] = [];
      for (const item of value) {
        snapshot.push(FetchClient.snapshotValue(item));
      }
      return snapshot;
    }

    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      return value;
    }

    const snapshot: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value)) {
      snapshot[key] = FetchClient.snapshotValue(nested);
    }

    return snapshot;
  }
}
