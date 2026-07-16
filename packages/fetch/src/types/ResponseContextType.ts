import type { RequestMetadataEntity } from '../entities/RequestMetadataEntity.js';

/**
 * Context passed to onResponse hook
 */
export type ResponseContextType = {
  /**
   * Request metadata for correlation
   */
  'request': RequestMetadataEntity.Type;

  /**
   * HTTP response
   */
  'response': Response;
};
