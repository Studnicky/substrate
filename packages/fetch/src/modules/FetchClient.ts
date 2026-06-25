/**
 * Configured HTTP client with interceptors and fluent request builder
 */

import type { ClientConfigType } from '../interfaces/ClientConfigType.js';
import type { DestroyOptionsType } from '../interfaces/DestroyOptionsType.js';
import type { FetchClientInterface } from '../interfaces/FetchClientInterface.js';
import type { FetchOptionsType } from '../interfaces/FetchOptionsType.js';
import type { RequestBuilderInterface } from '../interfaces/RequestBuilderInterface.js';
import type { RequestInterceptorContextType } from '../interfaces/RequestInterceptorContextType.js';
import type { RequestMetadataType } from '../interfaces/RequestMetadataType.js';
import type { ResponseInterceptorContextType } from '../interfaces/ResponseInterceptorContextType.js';
import type { SocketDispatcherStatsType } from '../interfaces/SocketDispatcherStatsType.js';
import type { RequestInterceptorType } from '../types/RequestInterceptorType.js';
import type { ResponseInterceptorType } from '../types/ResponseInterceptorType.js';
import type { ValidatorFnType } from '../types/ValidatorFnType.js';

import {
  validateAutoGenerateRequestId,
  validateDispatcher,
  validateHeaders,
  validateMetadata,
  validateName,
  validateOptions,
  validateParams,
  validateRequestIdGenerator,
  validateRequestInterceptor,
  validateResponseInterceptor,
  validateTimeout,
  validateURL
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
import { FetchClientBuilder } from './FetchClientBuilder.js';
import { HttpMethods } from './HttpMethods.js';
import { InterceptorManager } from './InterceptorManager.js';
import { RequestBuilder } from './RequestBuilder.js';
import { UndiciDispatcher } from './UndiciDispatcher.js';
import { UrlUtils } from './UrlUtils.js';

type RequestInterceptorInputType = readonly RequestInterceptorType[] | RequestInterceptorType | undefined;
type ResponseInterceptorInputType = readonly ResponseInterceptorType[] | ResponseInterceptorType | undefined;
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
 * HTTP client with default configuration and interceptors
 */
export class FetchClient implements FetchClientInterface {
  private static readonly EMPTY_ARRAY: never[] = Object.freeze([]) as never[];

  /**
   * Creates a new configured HTTP client
   *
   * @param config - Client configuration
   * @returns New FetchClient instance
   *
   * @example Single Interceptor
   * ```typescript
   * const api = FetchClient.create({
   *   baseURL: 'https://api.example.com',
   *   headers: { Authorization: 'Bearer token' },
   *   timeout: 5000,
   *   requestInterceptor: async (url, options) => {
   *     options.headers = { ...options.headers, 'X-Custom': 'value' };
   *     return { url, options };
   *   },
   *   responseInterceptor: async (response) => {
   *     if (!response.ok) throw new Error('Request failed');
   *     return response;
   *   }
   * });
   *
   * await api.get('/users');
   * ```
   *
   * @example Multiple Interceptors (Array)
   * ```typescript
   * const api = FetchClient.create({
   *   baseURL: 'https://api.example.com',
   *   requestInterceptor: [
   *     async (url, options) => {
   *       // Add auth
   *       options.headers = { ...options.headers, Authorization: 'Bearer token' };
   *       return { url, options };
   *     },
   *     async (url, options) => {
   *       // Add request ID
   *       options.headers = { ...options.headers, 'X-Request-ID': generateId() };
   *       return { url, options };
   *     },
   *     async (url, options) => {
   *       // Log request
   *       console.log(`[REQUEST] ${options.method} ${url}`);
   *       return { url, options };
   *     }
   *   ]
   * });
   * ```
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

  private readonly config: ClientConfigType;
  private readonly dispatcher: undefined | UndiciDispatcher;

  private readonly interceptors: InterceptorManager;

  protected constructor(config: ClientConfigType = {}) {
    const validated = FetchClient.validateConfig(config);

    this.config = validated;
    this.interceptors = InterceptorManager.create();

    if (validated.dispatcher?.enabled === true) {
      this.dispatcher = UndiciDispatcher.create(validated.dispatcher);
    }

    if (validated.requestInterceptor !== undefined) {
      const interceptors: readonly RequestInterceptorType[] = Array.isArray(validated.requestInterceptor)
        ? validated.requestInterceptor
        : [validated.requestInterceptor];

      const requestLen = interceptors.length;
      for (let i = 0; i < requestLen; i += 1) {
        this.interceptors.addRequestInterceptor(interceptors[i]!);
      }
    }

    if (validated.responseInterceptor !== undefined) {
      const interceptors: readonly ResponseInterceptorType[] = Array.isArray(validated.responseInterceptor)
        ? validated.responseInterceptor
        : [validated.responseInterceptor];

      const responseLen = interceptors.length;
      for (let i = 0; i < responseLen; i += 1) {
        this.interceptors.addResponseInterceptor(interceptors[i]!);
      }
    }
  }

  /**
   * Applies request interceptors to context
   * Client-level interceptors run first, then per-request interceptors
   */
  private async applyRequestInterceptors(
    context: RequestInterceptorContextType,
    perRequestInterceptors: RequestInterceptorType[]
  ): Promise<RequestInterceptorContextType> {
    let ctx = context;
    const clientInterceptors = this.interceptors.requestInterceptors;
    const clientLen = clientInterceptors.length;

    for (let i = 0; i < clientLen; i += 1) {
      ctx = await clientInterceptors[i]!(ctx);
      this.onRequestIntercept(i, ctx);
    }

    const perRequestLen = perRequestInterceptors.length;

    for (let j = 0; j < perRequestLen; j += 1) {
      ctx = await perRequestInterceptors[j]!(ctx);
      this.onRequestIntercept(clientLen + j, ctx);
    }

    return ctx;
  }

  /**
   * Applies response interceptors to context
   * Client-level interceptors run first, then per-request interceptors
   */
  private async applyResponseInterceptors(
    context: ResponseInterceptorContextType,
    perResponseInterceptors: ResponseInterceptorType[]
  ): Promise<ResponseInterceptorContextType> {
    let ctx = context;
    const clientInterceptors = this.interceptors.responseInterceptors;
    const clientLen = clientInterceptors.length;

    for (let i = 0; i < clientLen; i += 1) {
      ctx = await clientInterceptors[i]!(ctx);
      this.onResponseIntercept(i, ctx);
    }

    const perResponseLen = perResponseInterceptors.length;

    for (let j = 0; j < perResponseLen; j += 1) {
      ctx = await perResponseInterceptors[j]!(ctx);
      this.onResponseIntercept(clientLen + j, ctx);
    }

    return ctx;
  }

  /**
   * Builds full URL from base URL and path
   */
  private buildFullUrl(path: string): string {
    if (this.config.baseURL === undefined) {
      return path;
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
  ): RequestMetadataType {
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
  async destroy(options?: DestroyOptionsType): Promise<void> {
    if (this.dispatcher !== undefined) {
      this.onDispatcherDestroy();
      await this.dispatcher.destroy(options);
    }
  }

  /**
   * Executes the HTTP request with error handling
   */
  private async executeRequest(
    requestContext: RequestInterceptorContextType,
    method: string,
    requestId: string
  ): Promise<Response> {
    const startTime = Date.now();

    try {
      const response = await HttpMethods.fetch(requestContext.url, requestContext.options);
      const duration = Date.now() - startTime;

      if (response.ok) {
        this.onResponseSuccess(method, requestId, response.status, duration);
      } else {
        this.onResponseError(method, requestId, response.status, duration);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof TimeoutError) {
        this.onTimeout(method, requestId, requestContext.url, error.timeoutMs);
        this.onRequestError(error, method, requestId, requestContext.url, duration);
        throw error;
      }

      if (error instanceof AbortError) {
        this.onAbort(method, requestId, requestContext.url);
        this.onRequestError(error, method, requestId, requestContext.url, duration);
        throw error;
      }

      if (error instanceof Error) {
        const wrappedError = this.wrapUndiciError(error, requestContext.url, method, requestId, duration);

        if (wrappedError !== undefined) {
          throw wrappedError;
        }
      }

      this.onRequestError(error, method, requestId, requestContext.url, duration);
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
   * Internal fetch method that applies configuration and interceptors
   */
  private async fetch(path: string, options: FetchOptionsType = {}): Promise<Response> {
    const method = options.method ?? 'GET';
    const metadata = this.createRequestMetadata(path, method, options);
    const url = this.buildFullUrl(path);

    this.onRequestStart(method, path, metadata.requestId, url);

    const requestContext = await this.applyRequestInterceptors(
      {
        'metadata': metadata,
        'options': this.mergeOptions(options),
        'url': url
      },
      this.normalizeRequestInterceptorTypes(options.requestInterceptor)
    );

    const response = await this.executeRequest(requestContext, method, metadata.requestId);

    const responseContext = await this.applyResponseInterceptors(
      {
        'request': requestContext.metadata,
        'response': response
      },
      this.normalizeResponseInterceptorTypes(options.responseInterceptor)
    );

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
  private handleSocketExhaustion(
    url: string,
    errorCode: string,
    method: string,
    requestId: string,
    duration: number
  ): Error | undefined {
    if (this.dispatcher === undefined) {
      return undefined;
    }

    const origin = this.extractOrigin(url);

    if (origin === undefined) {
      return undefined;
    }

    const stats = this.dispatcher.getAgent().stats[origin] as SocketDispatcherStatsType | undefined;

    this.onRequestError(
      new Error(`Connection pool exhaustion: ${errorCode}`),
      method,
      requestId,
      url,
      duration
    );

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

  /** Fires after each request interceptor stage, with the output context. */
  protected onRequestIntercept(
    _index: number,
    _context: RequestInterceptorContextType
  ): void {}

  /** Fires after each response interceptor stage, with the output context. */
  protected onResponseIntercept(
    _index: number,
    _context: ResponseInterceptorContextType
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
   * Normalizes request interceptor parameter to array
   * Extracted as class method to avoid function allocation in hot path
   *
   * V8 Optimization: Returns a static frozen empty array for undefined
   * interceptors, eliminating 20,000+ allocations/sec at 10K req/sec.
   *
   * @param interceptor - Single interceptor, array, or undefined
   * @returns Array of request interceptors
   */
  private normalizeRequestInterceptorTypes(interceptor: RequestInterceptorInputType): RequestInterceptorType[] {
    if (interceptor === undefined) {
      return FetchClient.EMPTY_ARRAY;
    }
    if (Array.isArray(interceptor)) {
      return interceptor as RequestInterceptorType[];
    }

    return [interceptor as RequestInterceptorType];
  }

  /**
   * Normalizes response interceptor parameter to array
   * Extracted as class method to avoid function allocation in hot path
   *
   * V8 Optimization: Returns a static frozen empty array for undefined
   * interceptors, eliminating 20,000+ allocations/sec at 10K req/sec.
   *
   * @param interceptor - Single interceptor, array, or undefined
   * @returns Array of response interceptors
   */
  private normalizeResponseInterceptorTypes(interceptor: ResponseInterceptorInputType): ResponseInterceptorType[] {
    if (interceptor === undefined) {
      return FetchClient.EMPTY_ARRAY;
    }
    if (Array.isArray(interceptor)) {
      return interceptor as ResponseInterceptorType[];
    }

    return [interceptor as ResponseInterceptorType];
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
  async patch(path: string, options?: Omit<FetchOptionsType, 'body'> & { 'body'?: unknown }): Promise<Response> {
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
  async post(path: string, options?: Omit<FetchOptionsType, 'body'> & { 'body'?: unknown }): Promise<Response> {
    const result = this.fetch(path, this.prepareBodyRequest('POST', options));
    return await result;
  }

  /**
   * Prepares fetch options for requests with a body (POST, PUT, PATCH)
   * Handles json serialization and Content-Type header injection
   */
  private prepareBodyRequest(
    method: 'PATCH' | 'POST' | 'PUT',
    options?: Omit<FetchOptionsType, 'body'> & { 'body'?: unknown }
  ): FetchOptionsType {
    const { body, ...restOptions } = options ?? {};
    const serializedBody = this.serializeBody(body);
    const fetchOptions: FetchOptionsType = { ...restOptions, 'method': method };

    if (serializedBody !== undefined) {
      fetchOptions.body = serializedBody;

      if (this.shouldSetContentType(body)) {
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
  async put(path: string, options?: Omit<FetchOptionsType, 'body'> & { 'body'?: unknown }): Promise<Response> {
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
   * Serializes body to a form suitable for the native fetch API
   * - undefined/null: no body
   * - string: passed as-is
   * - Buffer/ArrayBuffer/ArrayBufferView: passed as-is (binary)
   * - any other value: JSON.stringify
   */
  private serializeBody(body: unknown): ArrayBuffer | string | Uint8Array | undefined {
    if (body === undefined || body === null) {
      return undefined;
    }

    if (typeof body === 'string') {
      return body;
    }

    if (body instanceof Buffer || body instanceof ArrayBuffer) {
      return body;
    }

    if (ArrayBuffer.isView(body)) {
      return body as Uint8Array;
    }

    return JSON.stringify(body);
  }

  /**
   * Determines whether Content-Type header should be auto-set to application/json
   * Returns true for plain objects/arrays (not Buffer, ArrayBuffer, or ArrayBufferView)
   *
   * @param body - Request body to check
   * @returns True if Content-Type should be set
   */
  private shouldSetContentType(body: unknown): boolean {
    return typeof body === 'object'
      && body !== null
      && !(body instanceof Buffer)
      && !(body instanceof ArrayBuffer)
      && !ArrayBuffer.isView(body);
  }

  /**
   * Wraps undici errors with custom error classes
   * @returns Custom error if recognized, undefined otherwise
   */
  private wrapUndiciError(
    error: Error,
    url: string,
    method: string,
    requestId: string,
    duration: number
  ): Error | undefined {
    const errorCode = (error as ErrorWithCodeType).code;

    if (errorCode === undefined) {
      return undefined;
    }

    const errorType = UNDICI_ERROR_MAP[errorCode];

    if (errorType === undefined) {
      return undefined;
    }

    if (errorType === 'connect') {
      const exhaustionError = this.handleSocketExhaustion(url, errorCode, method, requestId, duration);

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
    'autoGenerateRequestId': validateAutoGenerateRequestId,
    'baseURL': validateURL,
    'dispatcher': validateDispatcher,
    'headers': validateHeaders,
    'metadata': validateMetadata,
    'name': validateName,
    'options': validateOptions,
    'params': validateParams,
    'requestIdGenerator': validateRequestIdGenerator,
    'requestInterceptor': validateRequestInterceptor,
    'responseInterceptor': validateResponseInterceptor,
    'timeout': validateTimeout
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
