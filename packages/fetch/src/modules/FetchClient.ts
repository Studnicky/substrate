/**
 * Configured HTTP client with subclass-overridable lifecycle hooks and a fluent request builder
 */

import { HookInvoker } from '@studnicky/errors';

import type { DestroyOptionsEntity } from '../entities/DestroyOptionsEntity.js';
import type { RequestMetadataEntity } from '../entities/RequestMetadataEntity.js';
import type { SocketDispatcherStatsEntity } from '../entities/SocketDispatcherStatsEntity.js';
import type { FetchClientInterface } from '../interfaces/FetchClientInterface.js';
import type { RequestBuilderInterface } from '../interfaces/RequestBuilderInterface.js';
import type { BodyRequestOptionsType } from '../types/BodyRequestOptionsType.js';
import type { ClientConfigType } from '../types/ClientConfigType.js';
import type { FetchOptionsType } from '../types/FetchOptionsType.js';
import type { RequestContextType } from '../types/RequestContextType.js';
import type { ResponseContextType } from '../types/ResponseContextType.js';
import type { ValidatorFnType } from '../types/ValidatorFnType.js';

import {
  ValidateAutoGenerateRequestId,
  validateDispatcher,
  ValidateHeaders,
  ValidateHookTimeoutMs,
  ValidateMetadata,
  ValidateName,
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
import { FetchClientBuilder } from './FetchClientBuilder.js';
import { HttpMethods } from './HttpMethods.js';
import { RequestBuilder } from './RequestBuilder.js';
import { UndiciDispatcher } from './UndiciDispatcher.js';
import { UrlUtils } from './UrlUtils.js';

type ErrorWithCodeType = Error & { 'code'?: string };

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
 *   protected override async onRequest(context: RequestContextType): Promise<RequestContextType> {
 *     return {
 *       ...context,
 *       options: {
 *         ...context.options,
 *         headers: { ...context.options.headers, Authorization: `Bearer ${getToken()}` }
 *       }
 *     };
 *   }
 *
 *   protected override async onResponse(context: ResponseContextType): Promise<ResponseContextType> {
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
  static create(config: ClientConfigType = {}): FetchClient {
    return new this(config);
  }

  static builder(): FetchClientBuilder {
    const result = FetchClientBuilder.create((options) => {
      const client = FetchClient.create(options);
      return client;
    });
    return result;
  }

  protected readonly hooks: HookInvoker;

  private readonly config: ClientConfigType;
  private readonly dispatcher: undefined | UndiciDispatcher;

  protected constructor(config: ClientConfigType = {}) {
    const validated = FetchClient.validateConfig(config);

    this.config = validated;
    this.hooks = validated.hookTimeoutMs === undefined
      ? new HookInvoker()
      : new HookInvoker({ 'timeoutMs': validated.hookTimeoutMs });

    const dispatcher = validated.dispatcher?.enabled === true
      ? UndiciDispatcher.create(validated.dispatcher)
      : undefined;
    this.dispatcher = dispatcher;
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
    options: FetchOptionsType
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
  async delete(path: string, options?: FetchOptionsType): Promise<Response> {
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
      await Promise.resolve(this.hooks.invoke('onDispatcherDestroy', () => {
        const result = this.onDispatcherDestroy();
        return result;
      }));
      await this.dispatcher.destroy(options);
    }
  }

  /**
   * Executes the HTTP request with error handling
   */
  private async executeRequest(
    requestContext: RequestContextType,
    method: string,
    requestId: string
  ): Promise<Response> {
    const startTime = Date.now();

    try {
      const response = await HttpMethods.fetch(requestContext.url, requestContext.options);
      const duration = Date.now() - startTime;

      if (response.ok) {
        await Promise.resolve(this.hooks.invoke('onResponseSuccess', () => {
          const result = this.onResponseSuccess(method, requestId, response.status, duration);
          return result;
        }));
      } else {
        await Promise.resolve(this.hooks.invoke('onResponseError', () => {
          const result = this.onResponseError(method, requestId, response.status, duration);
          return result;
        }));
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof TimeoutError) {
        await Promise.resolve(this.hooks.invoke('onTimeout', () => {
          const result = this.onTimeout(method, requestId, requestContext.url, error.timeoutMs);
          return result;
        }));
        await Promise.resolve(this.hooks.invoke('onRequestError', () => {
          const result = this.onRequestError(error, method, requestId, requestContext.url, duration);
          return result;
        }));
        throw error;
      }

      if (error instanceof AbortError) {
        await Promise.resolve(this.hooks.invoke('onAbort', () => {
          const result = this.onAbort(method, requestId, requestContext.url);
          return result;
        }));
        await Promise.resolve(this.hooks.invoke('onRequestError', () => {
          const result = this.onRequestError(error, method, requestId, requestContext.url, duration);
          return result;
        }));
        throw error;
      }

      if (error instanceof Error) {
        const wrappedError = await this.wrapUndiciError(error, requestContext.url, method, requestId, duration);

        if (wrappedError !== undefined) {
          throw wrappedError;
        }
      }

      await Promise.resolve(this.hooks.invoke('onRequestError', () => {
        const result = this.onRequestError(error, method, requestId, requestContext.url, duration);
        return result;
      }));
      throw error;
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
  private async fetch(path: string, options: FetchOptionsType = {}): Promise<Response> {
    const method = options.method ?? 'GET';
    const metadata = this.createRequestMetadata(path, method, options);
    const url = this.buildFullUrl(path);

    await Promise.resolve(this.hooks.invoke('onRequestStart', () => {
      const result = this.onRequestStart(method, path, metadata.requestId, url);
      return result;
    }));

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
  async get(path: string, options?: FetchOptionsType): Promise<Response> {
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

    const stats = this.dispatcher.getAgent().stats[origin] as SocketDispatcherStatsEntity.Type | undefined;

    await Promise.resolve(this.hooks.invoke('onRequestError', () => {
      const result = this.onRequestError(
        new Error(`Connection pool exhaustion: ${errorCode}`),
        method,
        requestId,
        url,
        duration
      );
      return result;
    }));

    return new SocketExhaustionError(url, stats);
  }

  /**
   * Performs a HEAD request
   *
   * @param path - Request path (relative to baseURL)
   * @param options - Request options
   * @returns Response promise
   */
  async head(path: string, options?: FetchOptionsType): Promise<Response> {
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
   * protected override async onRequest(context: RequestContextType): Promise<RequestContextType> {
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
  protected onRequest(context: RequestContextType): Promise<RequestContextType> {
    const result: RequestContextType = context;
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
   * protected override async onResponse(context: ResponseContextType): Promise<ResponseContextType> {
   *   if (!context.response.ok) throw new Error(`HTTP ${context.response.status}`);
   *   return context;
   * }
   * ```
   */
  protected onResponse(context: ResponseContextType): Promise<ResponseContextType> {
    const result: ResponseContextType = context;
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
    // Fast path: no headers to merge
    if (this.config.headers === undefined && requestHeaders === undefined) {
      return {};
    }

    // Fast path: only config headers
    if (requestHeaders === undefined) {
      return { ...this.config.headers };
    }

    // Fast path: only request headers
    if (this.config.headers === undefined) {
      return requestHeaders;
    }

    // Only allocate once when both exist
    return {
      ...this.config.headers,
      ...requestHeaders
    };
  }

  /**
   * Merges config options with request options
   *
   * V8 Optimization: All properties assigned upfront to maintain consistent
   * hidden class. This ensures monomorphic inline caches for better performance.
   * Properties are always assigned (even if undefined) to prevent polymorphic shapes.
   */
  private mergeOptions(options: FetchOptionsType): FetchOptionsType {
    const timeout = options.timeout ?? this.config.timeout;
    const optionsDispatcher = (options as Record<string, unknown>).dispatcher;
    const configOptionsDispatcher = (this.config.options as Record<string, unknown> | undefined)?.dispatcher;
    const dispatcher = optionsDispatcher ?? configOptionsDispatcher ?? this.dispatcher?.getAgent();

    const merged: Record<string, unknown> = {
      ...this.config.options,
      ...options,
      'dispatcher': dispatcher,
      'headers': this.mergeHeaders(options.headers),
      'timeout': timeout
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
  async options(path: string, options?: FetchOptionsType): Promise<Response> {
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
  async patch(path: string, options?: BodyRequestOptionsType): Promise<Response> {
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
  async post(path: string, options?: BodyRequestOptionsType): Promise<Response> {
    const result = this.fetch(path, this.prepareBodyRequest('POST', options));
    return await result;
  }

  /**
   * Prepares fetch options for requests with a body (POST, PUT, PATCH)
   * Handles json serialization and Content-Type header injection
   */
  private prepareBodyRequest(
    method: 'PATCH' | 'POST' | 'PUT',
    options?: BodyRequestOptionsType
  ): FetchOptionsType {
    const {
      body, json, ...restOptions
    } = options ?? {};
    const effectiveBody = body !== undefined ? body : json;
    const serializedBody = BodySerializer.serialize(effectiveBody);
    const fetchOptions: FetchOptionsType = { ...restOptions, 'method': method };

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
  async put(path: string, options?: BodyRequestOptionsType): Promise<Response> {
    const result = this.fetch(path, this.prepareBodyRequest('PUT', options));
    return await result;
  }

  /**
   * Creates a fluent request builder for complex requests
   *
   * @param path - Request path (relative to baseURL)
   * @returns RequestBuilder instance for chaining
   *
   * @example Basic usage
   * ```typescript
   * const response = await client
   *   .request('/users')
   *   .queryString('page', 1)
   *   .queryString('limit', 10)
   *   .header('X-Custom', 'value')
   *   .timeout(5000)
   *   .get();
   * ```
   *
   * @example Chaining from .create()
   * ```typescript
   * const response = await FetchClient
   *   .create({ baseURL: 'https://api.example.com' })
   *   .request('/users')
   *   .queryString('active', true)
   *   .get();
   * ```
   */
  request(path: string): RequestBuilderInterface {
    const result = RequestBuilder.create(this, path);
    return result;
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
    const errorCode = (error as ErrorWithCodeType).code;

    if (errorCode === undefined) {
      return undefined;
    }

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

  private static readonly CONFIG_VALIDATORS: Record<string, ValidatorFnType> = {
    'autoGenerateRequestId': (value) => { ValidateAutoGenerateRequestId.validate(value); },
    'baseURL': (value) => { ValidateURL.validate(value); },
    'dispatcher': validateDispatcher,
    'headers': ValidateHeaders.validate,
    'hookTimeoutMs': (value) => { ValidateHookTimeoutMs.validate(value); },
    'metadata': ValidateMetadata.validate,
    'name': (value) => { ValidateName.validate(value); },
    'options': ValidateOptions.validate,
    'params': (value) => { ValidateParams.validate(value); },
    'requestIdGenerator': (value) => { ValidateRequestIdGenerator.validate(value); },
    'timeout': (value) => { ValidateTimeout.validate(value); }
  };

  private static validateConfig(config: ClientConfigType): ClientConfigType {
    if (typeof config !== 'object' || Array.isArray(config)) {
      throw new ConfigurationError('config must be an object');
    }

    const configObj = config as Record<string, unknown>;

    for (const [key, value] of Object.entries(configObj)) {
      const validator = FetchClient.CONFIG_VALIDATORS[key];

      if (validator === undefined) {
        throw new ConfigurationError(`"${key}" is not declared in the schema`);
      }

      validator(value);
    }

    return config;
  }
}
