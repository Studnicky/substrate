/**
 * FetchClient interface types
 */

import type { DestroyOptionsType } from './DestroyOptionsType.js';
import type { FetchOptionsType } from './FetchOptionsType.js';
import type { RequestBuilderInterface } from './RequestBuilderInterface.js';

/**
 * Interface for HTTP client with default configuration and interceptors
 */
export interface FetchClientInterface {
  delete(path: string, options?: FetchOptionsType): Promise<Response>;
  destroy(options?: DestroyOptionsType): Promise<void>;
  get(path: string, options?: FetchOptionsType): Promise<Response>;
  head(path: string, options?: FetchOptionsType): Promise<Response>;
  options(path: string, options?: FetchOptionsType): Promise<Response>;
  patch(path: string, body?: unknown, options?: FetchOptionsType): Promise<Response>;
  post(path: string, body?: unknown, options?: FetchOptionsType): Promise<Response>;
  put(path: string, body?: unknown, options?: FetchOptionsType): Promise<Response>;
  request(path: string): RequestBuilderInterface;
}
