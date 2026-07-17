/**
 * FetchClient interface types
 */

import type { DestroyOptionsEntity } from '../entities/DestroyOptionsEntity.js';
import type { BodyRequestOptionsType } from '../types/BodyRequestOptionsType.js';
import type { FetchOptionsType } from '../types/FetchOptionsType.js';
import type { RequestBuilderInterface } from './RequestBuilderInterface.js';

/**
 * Interface for HTTP client with default configuration and lifecycle hooks
 */
export interface FetchClientInterface {
  delete(path: string, options?: FetchOptionsType): Promise<Response>;
  destroy(options?: DestroyOptionsEntity.Type): Promise<void>;
  get(path: string, options?: FetchOptionsType): Promise<Response>;
  head(path: string, options?: FetchOptionsType): Promise<Response>;
  options(path: string, options?: FetchOptionsType): Promise<Response>;
  patch(path: string, options?: BodyRequestOptionsType): Promise<Response>;
  post(path: string, options?: BodyRequestOptionsType): Promise<Response>;
  put(path: string, options?: BodyRequestOptionsType): Promise<Response>;
  request(path: string): RequestBuilderInterface;
}
