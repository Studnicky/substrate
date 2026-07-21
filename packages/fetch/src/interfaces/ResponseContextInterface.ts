import type { RequestMetadataEntity } from '../entities/RequestMetadataEntity.js';

/**
 * Context passed to onResponse hook
 */
export interface ResponseContextInterface {
  /**
   * Request metadata for correlation
   */
  readonly 'request': RequestMetadataEntity.Type;

  /**
   * HTTP response
   */
  readonly 'response': Response;
}
