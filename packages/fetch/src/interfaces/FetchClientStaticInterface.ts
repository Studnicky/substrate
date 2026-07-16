import type { FetchClient } from '../modules/FetchClient.js';
import type { ClientConfigType } from '../types/ClientConfigType.js';

/**
 * Static methods interface for FetchClient
 */
export interface FetchClientStaticInterface {
  create(config?: ClientConfigType): FetchClient;
}
