/**
 * Unified request options: native Fetch settings plus Fetch client extensions.
 */

import type { FetchRequestOptionsEntity } from '../entities/FetchRequestOptionsEntity.js';
import type { RequestInitFieldNameEntity } from '../entities/RequestInitFieldNameEntity.js';

/**
 * Request options accepted by Fetch client operations.
 */
export interface FetchOptionsInterface
  extends FetchRequestOptionsEntity.InputType,
  Omit<RequestInit, RequestInitFieldNameEntity.Type | 'dispatcher'> {
  /**
   * Request body. Native-opaque: `fetch()` itself validates the shape.
   */
  'body'?: unknown;

  /**
   * Custom undici dispatcher or agent for Node.js connection pooling.
   */
  'dispatcher'?: unknown;

  /**
   * Plain value serialized as JSON with a JSON content type.
   */
  'json'?: unknown;
}
