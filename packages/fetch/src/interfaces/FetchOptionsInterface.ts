/**
 * Fetch options type
 */

import type { FetchRequestOptionsEntity } from '../entities/FetchRequestOptionsEntity.js';

/**
 * Unified fetch options with optional timeout, abort controller, and per-request configuration
 */
export interface FetchOptionsInterface {
  /**
   * Request body (raw/pre-serialized)
   * Use `json` instead to auto-serialize an object to JSON with Content-Type: application/json
   */
  'body'?: ArrayBuffer | null | ReadableStream | string | Uint8Array;

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
   *
   * @example
   * ```typescript
   * await client.get('/users', {
   *   metadata: {
   *     operation: 'fetchUsers',
   *     source: 'dashboard'
   *   }
   * });
   * ```
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
   *
   * @example
   * ```typescript
   * await client.get('/users', {
   *   requestId: 'req_from_upstream_service_123'
   * });
   * ```
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
