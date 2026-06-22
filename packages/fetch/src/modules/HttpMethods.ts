/**
 * HTTP method utilities as static class methods
 */

import type { FetchOptionsType } from '../interfaces/FetchOptionsType.js';

import {
  AbortError,
  ConfigurationError,
  TimeoutError
} from '../errors/index.js';

/**
 * HTTP request methods as static class
 */
export class HttpMethods {
  /**
   * Extracts only standard RequestInit properties from FetchOptionsType
   */
  private static toRequestInit(opts: FetchOptionsType, signal?: AbortSignal): object {
    // Destructure to exclude custom properties (dispatcher, json, metadata, requestId, timeout, interceptors)
    const {
      'dispatcher': _d,
      'json': _j,
      'metadata': _m,
      'requestId': _r,
      'requestInterceptor': _ri,
      'responseInterceptor': _ro,
      'signal': _s,
      'timeout': _t,
      ...standardProps
    } = opts;

    if (signal === undefined) {
      return { ...standardProps };
    }

    return { ...standardProps, 'signal': signal };
  }

  /**
   * Performs a DELETE request
   */
  static async del(url: string, opts: FetchOptionsType = {}): Promise<Response> {
    const result = HttpMethods.fetch(url, {
      ...opts,
      'method': 'DELETE'
    });
    return await result;
  }

  /**
   * Unified fetch wrapper with optional timeout and abort controller support
   */
  static async fetch(
    url: string,
    opts: FetchOptionsType = {}
  ): Promise<Response> {
    if (!url || typeof url !== 'string') {
      throw new ConfigurationError('url must be a non-empty string');
    }

    const {
      'signal': externalSignal, timeout, ...fetchOptions
    } = opts;

    if (timeout !== undefined && (typeof timeout !== 'number' || timeout <= 0 || !Number.isFinite(timeout))) {
      throw new ConfigurationError('timeout must be a positive number');
    }

    if (timeout === undefined) {
      return await HttpMethods.fetchWithoutTimeout(url, fetchOptions, externalSignal);
    }

    return await HttpMethods.fetchWithTimeout(url, fetchOptions, externalSignal, timeout);
  }

  /**
   * Hot path: fetch without timeout (separated for V8 optimization)
   */
  private static async fetchWithoutTimeout(
    url: string,
    fetchOptions: FetchOptionsType,
    externalSignal?: AbortSignal
  ): Promise<Response> {
    try {
      const init = HttpMethods.toRequestInit(fetchOptions, externalSignal);

      return await globalThis.fetch(url, init);
    } catch (error) {
      if ((error instanceof Error || error instanceof DOMException) && error.name === 'AbortError') {
        const message = error instanceof Error ? error.message : String(error);

        throw new AbortError(url, message);
      }
      throw error;
    }
  }

  /**
   * Hot path: fetch with timeout (separated for V8 optimization)
   */
  private static async fetchWithTimeout(
    url: string,
    fetchOptions: FetchOptionsType,
    externalSignal: AbortSignal | undefined,
    timeout: number
  ): Promise<Response> {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort(new TimeoutError(url, timeout));
    }, timeout);

    const signals = [timeoutController.signal];

    if (externalSignal) {
      signals.push(externalSignal);
    }
    const combinedSignal = AbortSignal.any(signals);

    try {
      const init = HttpMethods.toRequestInit(fetchOptions, combinedSignal);
      const response = await globalThis.fetch(url, init);

      return response;
    } catch (error) {
      if ((error instanceof Error || error instanceof DOMException) && error.name === 'AbortError') {
        if (timeoutController.signal.aborted) {
          throw new TimeoutError(url, timeout);
        }

        const message = error instanceof Error ? error.message : String(error);

        throw new AbortError(url, message);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Performs a GET request
   */
  static async get(url: string, opts: FetchOptionsType = {}): Promise<Response> {
    const result = HttpMethods.fetch(url, {
      ...opts,
      'method': 'GET'
    });
    return await result;
  }

  /**
   * Performs a HEAD request
   */
  static async head(url: string, opts: FetchOptionsType = {}): Promise<Response> {
    const result = HttpMethods.fetch(url, {
      ...opts,
      'method': 'HEAD'
    });
    return await result;
  }

  /**
   * Performs an OPTIONS request
   */
  static async options(url: string, opts: FetchOptionsType = {}): Promise<Response> {
    const result = HttpMethods.fetch(url, {
      ...opts,
      'method': 'OPTIONS'
    });
    return await result;
  }

  /**
   * Performs a PATCH request
   *
   * @param url - Request URL
   * @param body - Request body (auto-serialized to JSON if object/array; raw string/Buffer sent as-is)
   * @param opts - Fetch options
   */
  static async patch(url: string, body?: unknown, opts: FetchOptionsType = {}): Promise<Response> {
    const fetchOptions: FetchOptionsType = { ...opts, 'method': 'PATCH' };

    const serialized = HttpMethods.serializeRequestBody(body);

    if (serialized !== undefined) {
      fetchOptions.body = serialized;

      if (HttpMethods.needsContentType(body)) {
        fetchOptions.headers = { 'Content-Type': 'application/json', ...opts.headers };
      }
    }

    return await HttpMethods.fetch(url, fetchOptions);
  }

  /**
   * Performs a POST request
   *
   * @param url - Request URL
   * @param body - Request body (auto-serialized to JSON if object/array; raw string/Buffer sent as-is)
   * @param opts - Fetch options
   */
  static async post(url: string, body?: unknown, opts: FetchOptionsType = {}): Promise<Response> {
    const fetchOptions: FetchOptionsType = { ...opts, 'method': 'POST' };

    const serialized = HttpMethods.serializeRequestBody(body);

    if (serialized !== undefined) {
      fetchOptions.body = serialized;

      if (HttpMethods.needsContentType(body)) {
        fetchOptions.headers = { 'Content-Type': 'application/json', ...opts.headers };
      }
    }

    return await HttpMethods.fetch(url, fetchOptions);
  }

  /**
   * Performs a PUT request
   *
   * @param url - Request URL
   * @param body - Request body (auto-serialized to JSON if object/array; raw string/Buffer sent as-is)
   * @param opts - Fetch options
   */
  static async put(url: string, body?: unknown, opts: FetchOptionsType = {}): Promise<Response> {
    const fetchOptions: FetchOptionsType = { ...opts, 'method': 'PUT' };

    const serialized = HttpMethods.serializeRequestBody(body);

    if (serialized !== undefined) {
      fetchOptions.body = serialized;

      if (HttpMethods.needsContentType(body)) {
        fetchOptions.headers = { 'Content-Type': 'application/json', ...opts.headers };
      }
    }

    return await HttpMethods.fetch(url, fetchOptions);
  }

  /**
   * Determines whether Content-Type should be auto-set to application/json
   */
  private static needsContentType(body: unknown): boolean {
    return typeof body === 'object'
      && body !== null
      && !(body instanceof Buffer)
      && !(body instanceof ArrayBuffer)
      && !ArrayBuffer.isView(body);
  }

  /**
   * Serializes request body to string/buffer suitable for fetch
   */
  private static serializeRequestBody(body: unknown): ArrayBuffer | string | Uint8Array | undefined {
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
}
