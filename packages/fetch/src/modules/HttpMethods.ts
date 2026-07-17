/**
 * HTTP method utilities as static class methods
 */

import { fetch } from 'undici';

import type { BodyRequestOptionsType } from '../types/BodyRequestOptionsType.js';
import type { FetchOptionsType } from '../types/FetchOptionsType.js';

import {
  AbortError,
  ConfigurationError,
  TimeoutError
} from '../errors/index.js';
import { BodySerializer } from './BodySerializer.js';

/**
 * HTTP request methods as static class
 */
export class HttpMethods {
  /**
   * Extracts only standard RequestInit properties from FetchOptionsType
   */
  private static toRequestInit(opts: FetchOptionsType, signal?: AbortSignal): Record<string, unknown> {
    // Destructure to exclude custom properties (json, metadata, requestId, timeout);
    // dispatcher is re-attached below since undici's fetch() reads it off RequestInit
    const {
      dispatcher,
      'json': _j,
      'metadata': _m,
      'requestId': _r,
      'signal': _s,
      'timeout': _t,
      ...standardProps
    } = opts;

    const init: Record<string, unknown> = signal === undefined
      ? { ...standardProps }
      : { ...standardProps, 'signal': signal };

    if (dispatcher !== undefined) {
      init.dispatcher = dispatcher;
    }

    return init;
  }

  /**
   * Performs the actual network call.
   *
   * A custom `dispatcher` is only ever a Node undici `Agent`, so it must be dispatched
   * through undici's own `fetch` — the platform's native `globalThis.fetch` may be backed
   * by a different (internally vendored) undici build and can reject an externally
   * constructed Agent. Requests without a dispatcher keep using the native `fetch`
   * unchanged, which is what keeps this module runnable in the browser.
   */
  private static async performFetch(url: string, init: Record<string, unknown>): Promise<Response> {
    if (init.dispatcher === undefined) {
      return await globalThis.fetch(url, init);
    }

    return await fetch(url, init);
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
    if (typeof url !== 'string' || url === '') {
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

      return await HttpMethods.performFetch(url, init);
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

    if (externalSignal !== undefined) {
      signals.push(externalSignal);
    }
    const combinedSignal = AbortSignal.any(signals);

    try {
      const init = HttpMethods.toRequestInit(fetchOptions, combinedSignal);
      const response = await HttpMethods.performFetch(url, init);

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
   * @param opts - Fetch options including optional body (auto-serialized to JSON if object/array; raw string/Buffer sent as-is)
   */
  static async patch(url: string, opts?: BodyRequestOptionsType): Promise<Response> {
    const fetchOptions = HttpMethods.buildBodyRequestOptions('PATCH', opts);
    return await HttpMethods.fetch(url, fetchOptions);
  }

  /**
   * Performs a POST request
   *
   * @param url - Request URL
   * @param opts - Fetch options including optional body (auto-serialized to JSON if object/array; raw string/Buffer sent as-is)
   */
  static async post(url: string, opts?: BodyRequestOptionsType): Promise<Response> {
    const fetchOptions = HttpMethods.buildBodyRequestOptions('POST', opts);
    return await HttpMethods.fetch(url, fetchOptions);
  }

  /**
   * Performs a PUT request
   *
   * @param url - Request URL
   * @param opts - Fetch options including optional body (auto-serialized to JSON if object/array; raw string/Buffer sent as-is)
   */
  static async put(url: string, opts?: BodyRequestOptionsType): Promise<Response> {
    const fetchOptions = HttpMethods.buildBodyRequestOptions('PUT', opts);
    return await HttpMethods.fetch(url, fetchOptions);
  }

  /**
   * Builds fetch options for a body-bearing request (PATCH/POST/PUT)
   *
   * `body` (pre-serialized) takes precedence over `json` when both are provided.
   * `json` always forces the Content-Type header, matching `RequestBuilder.json()`.
   */
  private static buildBodyRequestOptions(
    method: 'PATCH' | 'POST' | 'PUT',
    opts: BodyRequestOptionsType | undefined
  ): FetchOptionsType {
    const {
      body, json, ...restOpts
    } = opts ?? {};
    const fetchOptions: FetchOptionsType = { ...restOpts, 'method': method };
    const effectiveBody = body !== undefined ? body : json;
    const serialized = BodySerializer.serialize(effectiveBody);

    if (serialized !== undefined) {
      fetchOptions.body = serialized;

      if (json !== undefined || BodySerializer.needsJsonContentType(effectiveBody)) {
        fetchOptions.headers = { 'Content-Type': 'application/json', ...restOpts.headers };
      }
    }

    return fetchOptions;
  }
}
