/**
 * Body-request options type
 */

import type { FetchRequestOptionsEntity } from '../entities/FetchRequestOptionsEntity.js';

/**
 * Fetch options for body-bearing requests (PATCH/POST/PUT) before body serialization.
 *
 * Same members as `FetchOptionsInterface` except `body`, which accepts any pre-serialization
 * value here (auto-serialized to JSON if object/array; raw string/Buffer sent as-is) rather
 * than the narrower post-serialization union `FetchOptionsInterface.body` carries.
 */
export interface BodyRequestOptionsInterface {
  /**
   * Request body as a pre-serialization value — auto-serialized to JSON if object/array,
   * sent as-is if a raw string/Buffer
   */
  'body'?: unknown;

  /**
   * Cache mode
   */
  'cache'?: FetchRequestOptionsEntity.Type['cache'];

  /**
   * Credentials mode
   */
  'credentials'?: FetchRequestOptionsEntity.Type['credentials'];

  /**
   * Custom undici dispatcher/agent for connection pooling
   */
  'dispatcher'?: unknown;

  /**
   * Request headers
   */
  'headers'?: Record<string, string>;

  /**
   * Subresource integrity value
   */
  'integrity'?: FetchRequestOptionsEntity.Type['integrity'];

  /**
   * Request body as a plain value — auto-serialized to JSON with Content-Type: application/json
   * Use for POST/PUT/PATCH requests with a JSON payload
   */
  'json'?: unknown;

  /**
   * Keep-alive mode
   */
  'keepalive'?: FetchRequestOptionsEntity.Type['keepalive'];

  /**
   * Per-request metadata for logging and tracking
   *
   * Merged with client-level metadata
   * Accessible in hooks via metadata.metadata
   */
  'metadata'?: Record<string, unknown>;

  /**
   * HTTP method
   */
  'method'?: FetchRequestOptionsEntity.Type['method'];

  /**
   * Redirect mode
   */
  'redirect'?: FetchRequestOptionsEntity.Type['redirect'];

  /**
   * Referrer URL
   */
  'referrer'?: FetchRequestOptionsEntity.Type['referrer'];

  /**
   * Referrer policy
   */
  'referrerPolicy'?: FetchRequestOptionsEntity.Type['referrerPolicy'];

  /**
   * Override auto-generated request ID
   *
   * If provided, this ID will be used instead of auto-generating one
   * Useful for passing request IDs from upstream services
   */
  'requestId'?: FetchRequestOptionsEntity.Type['requestId'];

  /**
   * Optional AbortController signal for manual cancellation
   * If timeout is provided without a signal, one will be created automatically
   */
  'signal'?: AbortSignal;

  /**
   * Optional request timeout in milliseconds
   * If not provided, no timeout is enforced
   */
  'timeout'?: FetchRequestOptionsEntity.Type['timeout'];
}
