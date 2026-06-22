import type { RequestMetadataType } from './RequestMetadataType.js';

/**
 * Context passed to response interceptors
 */
export type ResponseInterceptorContextType = {
  /**
   * Request metadata for correlation
   */
  'request': RequestMetadataType;

  /**
   * HTTP response
   */
  'response': Response;
};
