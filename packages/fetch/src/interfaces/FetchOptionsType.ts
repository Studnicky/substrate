/**
 * Fetch options type
 */

import type { RequestInterceptorType } from '../types/RequestInterceptorType.js';
import type { ResponseInterceptorType } from '../types/ResponseInterceptorType.js';
import type { BaseFetchOptionsType } from './BaseFetchOptionsType.js';

/**
 * Unified fetch options with optional timeout, abort controller, and interceptor support
 * Extends BaseFetchOptionsType with interceptor properties
 */
export type FetchOptionsType = BaseFetchOptionsType & {
  /**
   * Per-request interceptor(s) to modify request before sending
   * Applied after client-level interceptors
   * Can be a single function or an array of functions executed in order
   */
  'requestInterceptor'?: readonly RequestInterceptorType[] | RequestInterceptorType;

  /**
   * Per-request interceptor(s) to modify response after receiving
   * Applied after client-level interceptors
   * Can be a single function or an array of functions executed in order
   */
  'responseInterceptor'?: readonly ResponseInterceptorType[] | ResponseInterceptorType;
};
