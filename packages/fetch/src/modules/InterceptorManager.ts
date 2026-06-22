/**
 * Request and response interceptors
 */

import { Pipeline } from '@studnicky/pipeline';

import type { InterceptorManagerInterface } from '../interfaces/InterceptorManagerInterface.js';
import type { RequestInterceptorContextType } from '../interfaces/RequestInterceptorContextType.js';
import type { ResponseInterceptorContextType } from '../interfaces/ResponseInterceptorContextType.js';
import type { RequestInterceptorType } from '../types/RequestInterceptorType.js';
import type { ResponseInterceptorType } from '../types/ResponseInterceptorType.js';

/**
 * Manages request and response interceptors
 */
export class InterceptorManager implements InterceptorManagerInterface {
  private readonly requestPipeline = new Pipeline<RequestInterceptorContextType>();
  private readonly responsePipeline = new Pipeline<ResponseInterceptorContextType>();

  /**
   * Current request interceptors (readonly view)
   */
  get requestInterceptors(): readonly RequestInterceptorType[] {
    return this.requestPipeline.stages;
  }

  /**
   * Current response interceptors (readonly view)
   */
  get responseInterceptors(): readonly ResponseInterceptorType[] {
    return this.responsePipeline.stages;
  }

  /**
   * Adds a request interceptor
   *
   * @param interceptor - Function to modify request before sending
   * @returns Function to remove this interceptor
   *
   * @example
   * ```typescript
   * const remove = manager.addRequestInterceptor(async ({ url, options, metadata }) => {
   *   return {
   *     url,
   *     options: {
   *       ...options,
   *       headers: {
   *         ...options.headers,
   *         Authorization: `Bearer ${token}`
   *       }
   *     },
   *     metadata
   *   };
   * });
   *
   * // Later: remove the interceptor
   * remove();
   * ```
   */
  addRequestInterceptor(interceptor: RequestInterceptorType): () => void {
    const result = this.requestPipeline.add(interceptor);
    return result;
  }

  /**
   * Adds a response interceptor
   *
   * @param interceptor - Function to modify response after receiving
   * @returns Function to remove this interceptor
   *
   * @example
   * ```typescript
   * const remove = manager.addResponseInterceptor(async ({ response, request }) => {
   *   if (response.status === 401) {
   *     await refreshToken();
   *   }
   *   return { response, request };
   * });
   *
   * // Later: remove the interceptor
   * remove();
   * ```
   */
  addResponseInterceptor(interceptor: ResponseInterceptorType): () => void {
    const result = this.responsePipeline.add(interceptor);
    return result;
  }

  /**
   * Applies all request interceptors in order
   */
  applyRequestInterceptors(context: RequestInterceptorContextType): Promise<RequestInterceptorContextType> {
    const result = this.requestPipeline.run(context);
    return result;
  }

  /**
   * Applies all response interceptors in order
   */
  applyResponseInterceptors(context: ResponseInterceptorContextType): Promise<ResponseInterceptorContextType> {
    const result = this.responsePipeline.run(context);
    return result;
  }

  /**
   * Clears all interceptors
   */
  clearAll(): void {
    this.requestPipeline.clear();
    this.responsePipeline.clear();
  }

  /**
   * Clears all request interceptors
   */
  clearRequestInterceptors(): void {
    this.requestPipeline.clear();
  }

  /**
   * Clears all response interceptors
   */
  clearResponseInterceptors(): void {
    this.responsePipeline.clear();
  }
}
