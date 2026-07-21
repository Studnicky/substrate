/**
 * FetchClient configuration types
 */

import type { ClientConfigDataEntity } from '../entities/ClientConfigDataEntity.js';
import type { DispatcherConfigEntity } from '../entities/DispatcherConfigEntity.js';
import type { FetchOptionsInterface } from './FetchOptionsInterface.js';
import type { QueryParamsInterface } from './QueryParamsInterface.js';

/**
 * Client configuration options
 */
export interface ClientConfigInterface {
  /**
   * Automatically generate request IDs for tracking
   * Default: true
   *
   * When enabled, each request gets a unique ID for correlation
   * The ID is accessible in lifecycle hooks via metadata.requestId
   */
  'autoGenerateRequestId'?: ClientConfigDataEntity.Type['autoGenerateRequestId'];

  /**
   * Base URL prepended to all requests
   */
  'baseURL'?: ClientConfigDataEntity.Type['baseURL'];

  /**
   * HTTP connection pooling configuration
   *
   * Enables connection reuse across multiple requests to prevent socket exhaustion.
   * Essential when making many requests to the same endpoint (e.g., graph databases).
   *
   * Set `enabled: true` to activate connection pooling, which:
   * - Reuses HTTP connections instead of creating new ones for each request
   * - Limits concurrent connections to prevent exhausting system sockets
   * - Implements proper keep-alive behavior for long-lived connections
   * - Prevents ECONNREFUSED and 405 errors from socket exhaustion
   *
   * Uses undici (Node.js's high-performance HTTP client) for implementation.
   *
   * @example
   * ```typescript
   * // Minimal - prevents socket exhaustion
   * { dispatcher: { enabled: true } }
   *
   * // Recommended - with explicit pool size
   * { dispatcher: { enabled: true, connections: 20 } }
   * ```
   */
  'dispatcher'?: DispatcherConfigEntity.Type;

  /**
   * Default headers for all requests
   */
  'headers'?: Record<string, string>;

  /**
   * Timeout in milliseconds for lifecycle hook invocations (onRequestStart,
   * onResponseSuccess, onResponseError, onRequestError, onTimeout, onAbort,
   * onDispatcherDestroy)
   *
   * When unset, a hook may take arbitrarily long, matching prior behavior.
   * When set, a hook that never settles within this window fails with a
   * HookInvocationError whose cause is a HookTimeoutError.
   */
  'hookTimeoutMs'?: ClientConfigDataEntity.Type['hookTimeoutMs'];

  /**
   * Default metadata for all requests
   *
   * Key-value pairs that flow through the onRequest/onResponse lifecycle hooks
   * Useful for logging, tracking, and correlating requests
   *
   * @example
   * ```typescript
   * {
   *   metadata: {
   *     service: 'user-api',
   *     environment: 'production'
   *   }
   * }
   * ```
   */
  'metadata'?: Record<string, unknown>;

  /**
   * Additional fetch options applied to all requests
   */
  'options'?: FetchOptionsInterface;

  /**
   * Default query parameters for all requests
   */
  'params'?: QueryParamsInterface;

  /**
   * Custom function to generate request IDs
   *
   * If not provided, uses crypto.randomUUID()
   * Only used when autoGenerateRequestId is true
   *
   * @example
   * ```typescript
   * {
   *   requestIdGenerator: () => `req_${Date.now()}_${Math.random()}`
   * }
   * ```
   */
  'requestIdGenerator'?: () => string;

  /**
   * Default timeout in milliseconds
   */
  'timeout'?: ClientConfigDataEntity.Type['timeout'];
}
