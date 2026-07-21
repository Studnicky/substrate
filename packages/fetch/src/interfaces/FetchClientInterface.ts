/**
 * FetchClient interface types
 */

import type { DestroyOptionsEntity } from '../entities/DestroyOptionsEntity.js';
import type { BodyRequestOptionsInterface } from './BodyRequestOptionsInterface.js';
import type { FetchOptionsInterface } from './FetchOptionsInterface.js';

/**
 * Interface for HTTP client with default configuration and lifecycle hooks
 */
export interface FetchClientInterface {
  delete(path: string, options?: FetchOptionsInterface): Promise<Response>;
  destroy(options?: DestroyOptionsEntity.Type): Promise<void>;
  get(path: string, options?: FetchOptionsInterface): Promise<Response>;
  head(path: string, options?: FetchOptionsInterface): Promise<Response>;
  options(path: string, options?: FetchOptionsInterface): Promise<Response>;
  patch(path: string, options?: BodyRequestOptionsInterface): Promise<Response>;
  post(path: string, options?: BodyRequestOptionsInterface): Promise<Response>;
  put(path: string, options?: BodyRequestOptionsInterface): Promise<Response>;
}
