/**
 * Fluent request builder for chaining request configuration
 */

import type { FetchClientInterface } from '../interfaces/FetchClientInterface.js';
import type { RequestBuilderInterface } from '../interfaces/RequestBuilderInterface.js';
import type { BodyRequestOptionsType } from '../types/BodyRequestOptionsType.js';
import type { FetchOptionsType } from '../types/FetchOptionsType.js';
import type { QueryParamsType } from '../types/QueryParamsType.js';
import type { QueryValueType } from '../types/QueryValueType.js';

import { UrlUtils } from './UrlUtils.js';

/**
 * Fluent request builder for chaining request configuration
 */
export class RequestBuilder implements RequestBuilderInterface {
  static create(client: FetchClientInterface, path: string): RequestBuilder {
    return new RequestBuilder(client, path);
  }

  private readonly client: FetchClientInterface;
  private readonly fetchOptions: FetchOptionsType = {};
  private readonly path: string;
  private queryParams?: QueryParamsType;
  private requestBody?: unknown;

  protected constructor(client: FetchClientInterface, path: string) {
    this.client = client;
    this.path = path;
  }

  /**
   * Sets request body
   *
   * @param body - Request body
   * @returns This builder for chaining
   */
  body(body: unknown): this {
    this.requestBody = body;

    return this;
  }

  /**
   * Sets cache mode
   *
   * @param value - Cache mode
   * @returns This builder for chaining
   */
  cache(value: Exclude<FetchOptionsType['cache'], undefined>): this {
    this.fetchOptions.cache = value;

    return this;
  }

  /**
   * Sets credentials mode
   *
   * @param value - Credentials mode
   * @returns This builder for chaining
   */
  credentials(value: Exclude<FetchOptionsType['credentials'], undefined>): this {
    this.fetchOptions.credentials = value;

    return this;
  }

  /**
   * Builds final fetch options
   */
  private buildOptions(): FetchOptionsType {
    return { ...this.fetchOptions };
  }

  /**
   * Builds final path with query parameters
   */
  private buildPath(): string {
    if (this.queryParams === undefined) {
      return this.path;
    }

    return UrlUtils.buildUrl(this.path, this.queryParams);
  }

  /**
   * Executes a DELETE request
   *
   * @returns Response promise
   */
  async delete(): Promise<Response> {
    const path = this.buildPath();
    const options = this.buildOptions();

    return await this.client.delete(path, options);
  }

  /**
   * Sets a custom undici dispatcher/agent for connection pooling
   *
   * @param value - Dispatcher/agent instance
   * @returns This builder for chaining
   */
  dispatcher(value: Exclude<FetchOptionsType['dispatcher'], undefined>): this {
    this.fetchOptions.dispatcher = value;

    return this;
  }

  /**
   * Executes a GET request
   *
   * @returns Response promise
   */
  async get(): Promise<Response> {
    const path = this.buildPath();
    const options = this.buildOptions();

    return await this.client.get(path, options);
  }

  /**
   * Executes a HEAD request
   *
   * @returns Response promise
   */
  async head(): Promise<Response> {
    const path = this.buildPath();
    const options = this.buildOptions();

    return await this.client.head(path, options);
  }

  /**
   * Sets a single header
   *
   * @param name - Header name
   * @param value - Header value
   * @returns This builder for chaining
   */
  header(name: string, value: string): this {
    const newHeaders: Record<string, string> = { ...this.fetchOptions.headers };
    newHeaders[name] = value;
    this.fetchOptions.headers = newHeaders;

    return this;
  }

  /**
   * Sets multiple headers
   *
   * @param headers - Headers to set
   * @returns This builder for chaining
   */
  headers(headers: Record<string, string>): this {
    this.fetchOptions.headers = {
      ...this.fetchOptions.headers,
      ...headers
    };

    return this;
  }

  /**
   * Sets subresource integrity value
   *
   * @param value - Integrity value
   * @returns This builder for chaining
   */
  integrity(value: Exclude<FetchOptionsType['integrity'], undefined>): this {
    this.fetchOptions.integrity = value;

    return this;
  }

  /**
   * Sets JSON body and Content-Type header
   *
   * @param data - Data to serialize as JSON
   * @returns This builder for chaining
   */
  json(data: unknown): this {
    this.requestBody = data;
    this.fetchOptions.headers = {
      ...this.fetchOptions.headers,
      'Content-Type': 'application/json'
    };

    return this;
  }

  /**
   * Sets keep-alive mode
   *
   * @param value - Keep-alive mode
   * @returns This builder for chaining
   */
  keepalive(value: Exclude<FetchOptionsType['keepalive'], undefined>): this {
    this.fetchOptions.keepalive = value;

    return this;
  }

  /**
   * Sets request metadata for logging and tracking
   *
   * Merged with client-level metadata
   * Accessible in lifecycle hooks via metadata.metadata
   *
   * @param metadata - Key-value pairs for tracking
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * await client.request('/users')
   *   .metadata({ operation: 'fetchUsers', source: 'dashboard' })
   *   .get();
   * ```
   */
  metadata(metadata: Record<string, unknown>): this {
    this.fetchOptions.metadata = {
      ...this.fetchOptions.metadata,
      ...metadata
    };

    return this;
  }

  /**
   * Executes an OPTIONS request
   *
   * @returns Response promise
   */
  async options(): Promise<Response> {
    const path = this.buildPath();
    const options = this.buildOptions();

    return await this.client.options(path, options);
  }

  /**
   * Builds options for body-bearing methods, merging fetchOptions with the stored request body
   */
  private buildBodyOptions(): BodyRequestOptionsType {
    const opts: BodyRequestOptionsType = this.buildOptions();
    opts.body = this.requestBody;
    return opts;
  }

  /**
   * Executes a PATCH request
   *
   * @returns Response promise
   */
  async patch(): Promise<Response> {
    const result = this.client.patch(this.buildPath(), this.buildBodyOptions());
    return await result;
  }

  /**
   * Executes a POST request
   *
   * @returns Response promise
   */
  async post(): Promise<Response> {
    const result = this.client.post(this.buildPath(), this.buildBodyOptions());
    return await result;
  }

  /**
   * Executes a PUT request
   *
   * @returns Response promise
   */
  async put(): Promise<Response> {
    const result = this.client.put(this.buildPath(), this.buildBodyOptions());
    return await result;
  }

  /**
   * Adds a query string parameter
   *
   * Supports repeated keys by calling multiple times with the same key:
   * ```typescript
   * builder
   *   .queryString('tag', 'foo')
   *   .queryString('tag', 'bar')  // Results in: ?tag=foo&tag=bar
   * ```
   *
   * @param key - Query parameter key
   * @param value - Query parameter value (string, number, boolean, null, undefined, or array)
   * @returns This builder for chaining
   */
  queryString(key: string, value: QueryValueType | QueryValueType[]): this {
    this.queryParams ??= {};

    const existingValue = this.queryParams[key];

    // If key already exists, convert to array or append to existing array
    if (existingValue === undefined) {
      // New key, set directly
      this.queryParams[key] = value;
    } else if (Array.isArray(existingValue)) {
      // Already an array, append new value(s)
      this.queryParams[key] = Array.isArray(value)
        ? [
          ...existingValue,
          ...value
        ]
        : [
          ...existingValue,
          value
        ];
    } else {
      // Convert to array with existing and new value(s)
      this.queryParams[key] = Array.isArray(value)
        ? [
          existingValue,
          ...value
        ]
        : [
          existingValue,
          value
        ];
    }

    return this;
  }

  /**
   * Sets redirect mode
   *
   * @param value - Redirect mode
   * @returns This builder for chaining
   */
  redirect(value: Exclude<FetchOptionsType['redirect'], undefined>): this {
    this.fetchOptions.redirect = value;

    return this;
  }

  /**
   * Sets referrer URL
   *
   * @param value - Referrer URL
   * @returns This builder for chaining
   */
  referrer(value: Exclude<FetchOptionsType['referrer'], undefined>): this {
    this.fetchOptions.referrer = value;

    return this;
  }

  /**
   * Sets referrer policy
   *
   * @param value - Referrer policy
   * @returns This builder for chaining
   */
  referrerPolicy(value: Exclude<FetchOptionsType['referrerPolicy'], undefined>): this {
    this.fetchOptions.referrerPolicy = value;

    return this;
  }

  /**
   * Sets custom request ID
   *
   * Overrides auto-generated request ID
   * Useful for passing request IDs from upstream services
   *
   * @param id - Request ID
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * await client.request('/users')
   *   .requestId('req_from_upstream_123')
   *   .get();
   * ```
   */
  requestId(id: string): this {
    this.fetchOptions.requestId = id;

    return this;
  }

  /**
   * Sets abort signal
   *
   * @param signal - AbortSignal
   * @returns This builder for chaining
   */
  signal(signal: AbortSignal): this {
    this.fetchOptions.signal = signal;

    return this;
  }

  /**
   * Sets request timeout
   *
   * @param ms - Timeout in milliseconds
   * @returns This builder for chaining
   */
  timeout(ms: number): this {
    this.fetchOptions.timeout = ms;

    return this;
  }
}
