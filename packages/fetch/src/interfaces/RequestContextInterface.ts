import type { RequestEventEntity } from '../entities/RequestEventEntity.js';
import type { RequestMetadataEntity } from '../entities/RequestMetadataEntity.js';
import type { FetchOptionsInterface } from './FetchOptionsInterface.js';

/**
 * Context passed to onRequest hook
 */
export interface RequestContextInterface {
  /**
   * Request metadata and tracking information
   */
  readonly 'metadata': RequestMetadataEntity.Type;

  /**
   * Fetch options
   */
  readonly 'options': FetchOptionsInterface;

  /**
   * Request URL
   */
  readonly 'url': RequestEventEntity.Type['url'];
}
