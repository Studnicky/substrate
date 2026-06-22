import type { BaseFetchOptionsType } from './BaseFetchOptionsType.js';
import type { RequestMetadataType } from './RequestMetadataType.js';

/**
 * Context passed to request interceptors
 */
export type RequestInterceptorContextType = {
  /**
   * Request metadata and tracking information
   */
  'metadata': RequestMetadataType;

  /**
   * Fetch options
   */
  'options': BaseFetchOptionsType;

  /**
   * Request URL
   */
  'url': string;
};
