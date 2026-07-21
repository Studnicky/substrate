/**
 * Undici Dispatcher for connection pooling
 * Wraps undici Agent with validated configuration
 */


import { Agent } from 'undici';

import type { DestroyOptionsEntity } from '../entities/DestroyOptionsEntity.js';
import type { DispatcherHealthEntity } from '../entities/DispatcherHealthEntity.js';
import type { UndiciDispatcherInterface } from '../interfaces/UndiciDispatcherInterface.js';

import {
  POOL_OVERLOAD_MULTIPLIER,
  POOL_OVERLOAD_THRESHOLD,
  POOL_PRESSURE_MULTIPLIER,
  POOL_PRESSURE_THRESHOLD
} from '../constants/POOL_HEALTH.js';
import { SocketDispatcherStatsEntity } from '../entities/SocketDispatcherStatsEntity.js';
import { ConfigurationError } from '../errors/index.js';
import { Delay } from './Delay.js';

/**
 * Dispatcher for HTTP connection pooling using undici Agent
 *
 * The Agent manages connection pools across multiple origins (hosts).
 * Each origin gets its own Pool with the specified configuration.
 */
export class UndiciDispatcher implements UndiciDispatcherInterface {
  /**
   * Creates lifecycle and health management for a caller-owned undici Agent.
   *
   * @param agent - Agent retained by the caller and used for requests
   * @returns UndiciDispatcher instance
   *
   * @example
   * ```typescript
   * import { UndiciDispatcher } from '@studnicky/fetch';
   * import { Agent } from 'undici';
   *
   * const agent = new Agent({ connections: 20, pipelining: 1 });
   * const dispatcher = UndiciDispatcher.create(agent);
   *
   * // Use with fetch
   * const response = await fetch('https://api.example.com/data', {
   *   dispatcher: agent
   * });
   *
   * // Cleanup when done
   * dispatcher.destroy();
   * ```
   *
   * @example With FetchClient
   * ```typescript
   * import { FetchClient } from '@studnicky/fetch';
   *
   * const client = FetchClient.create({
   *   baseURL: 'https://api.example.com',
   *   dispatcher: { enabled: true, connections: 50 }
   * });
   *
   * const response = await client.get('/users');
   * ```
   */
  static create(agent: Agent): UndiciDispatcher {
    return new this(agent);
  }

  private readonly agent: Agent;

  /**
   * Protected constructor - use UndiciDispatcher.create() instead
   *
   * @param agent - Caller-owned undici Agent
   */
  protected constructor(agent: Agent) {
    if (!(agent instanceof Agent)) {
      throw new ConfigurationError('dispatcher agent must be an undici Agent');
    }
    this.agent = agent;
  }

  /**
   * Check the health of a connection pool for a specific origin
   *
   * Analyzes dispatcher statistics to determine if the connection pool is healthy or overloaded.
   * The dispatcher is considered unhealthy when the ratio of pending requests to
   * connected sockets exceeds 0.5 (50%).
   *
   * Health assessment:
   * - queueRatio < 0.5: Healthy (green)
   * - queueRatio 0.5-1.0: Warning (yellow) - consider increasing pool size
   * - queueRatio > 1.0: Unhealthy (red) - connection pool is overloaded
   *
   * @param origin - The origin URL to check (e.g., "https://api.example.com:443")
   * @returns Dispatcher health assessment
   *
   * @example
   * ```typescript
   * import { UndiciDispatcher } from '@studnicky/fetch';
   * import { Agent } from 'undici';
   *
   * const agent = new Agent({ connections: 20 });
   * const dispatcher = UndiciDispatcher.create(agent);
   *
   * // Make some requests...
   * await fetch('https://api.example.com/data', {
   *   dispatcher: agent
   * });
   *
   * // Check dispatcher health
   * const health = dispatcher.checkDispatcherHealth('https://api.example.com:443');
   *
   * if (!health.healthy) {
   *   console.warn('Dispatcher is unhealthy!');
   *   console.warn(`Queue ratio: ${health.queueRatio}`);
   *   console.warn(`Recommendation: ${health.recommendation}`);
   * }
   * ```
   *
   * @example Monitoring in production
   * ```typescript
   * setInterval(() => {
   *   const health = dispatcher.checkDispatcherHealth('https://api.example.com:443');
   *
   *   if (!health.healthy) {
   *     logger.warn('Connection pool unhealthy', {
   *       origin: 'https://api.example.com:443',
   *       queueRatio: health.queueRatio,
   *       stats: health.stats
   *     });
   *   }
   * }, 5000); // Check every 5 seconds
   * ```
   */
  checkDispatcherHealth(origin: string): DispatcherHealthEntity.Type {
    const stats = this.agent.stats[origin];

    if (stats === undefined || !SocketDispatcherStatsEntity.validate(stats)) {
      return { 'healthy': true };
    }

    const queueRatio = stats.connected > 0
      ? stats.pending / stats.connected
      : 0;

    const healthy = queueRatio < POOL_PRESSURE_THRESHOLD;

    let recommendation: string | undefined;

    if (queueRatio > POOL_OVERLOAD_THRESHOLD) {
      recommendation = `Connection pool is overloaded. Increase connections from ${stats.connected} to at least ${Math.ceil(stats.connected * POOL_OVERLOAD_MULTIPLIER)} (pending: ${stats.pending}, ratio: ${queueRatio.toFixed(2)})`;
    } else if (queueRatio >= POOL_PRESSURE_THRESHOLD) {
      recommendation = `Connection pool is under pressure. Consider increasing connections from ${stats.connected} to ${Math.ceil(stats.connected * POOL_PRESSURE_MULTIPLIER)} (pending: ${stats.pending}, ratio: ${queueRatio.toFixed(2)})`;
    }

    return {
      'healthy': healthy,
      'queueRatio': queueRatio,
      'stats': stats,
      ...(recommendation !== undefined && { 'recommendation': recommendation })
    };
  }

  /**
   * Close the dispatcher and gracefully close all connections
   *
   * @returns Promise that resolves when all connections are closed
   */
  async close(): Promise<void> {
    await this.agent.close();
  }

  /**
   * Destroy the dispatcher and cancel all in-flight requests
   *
   * @param options - Optional destroy configuration
   * @param options.timeout - Time in milliseconds to wait before aborting requests
   *   - `undefined` or `0`: Abort immediately (default)
   *   - `> 0`: Wait up to this duration for requests to complete, then abort remaining
   *
   * @returns Promise that resolves when all connections are closed
   *
   * @example Immediate abort (default)
   * ```typescript
   * const agent = new Agent({ connections: 10 });
   * const dispatcher = UndiciDispatcher.create(agent);
   *
   * // Start a slow request
   * // Immediately cancel the request and close connections
   * await dispatcher.destroy();
   *
   * // The request will reject with AbortError
   * await request; // throws AbortError
   * ```
   *
   * @example Graceful shutdown with timeout
   * ```typescript
   * // Wait up to 5 seconds for requests to complete
   * await dispatcher.destroy({ timeout: 5000 });
   * ```
   */
  async destroy(options?: DestroyOptionsEntity.Type): Promise<void> {
    const timeout = options?.timeout;

    if (timeout !== undefined && timeout > 0) {
      await Delay.for(timeout);
    }

    await this.agent.destroy();
  }

  /**
   * Get connection pool statistics for all origins
   *
   * @returns Frozen record mapping origin URLs to frozen dispatcher statistics
   */
  getStats(): Readonly<Record<string, unknown>> {
    const stats = this.agent.stats;
    const frozenStats: Record<string, unknown> = {};

    for (const [origin, dispatcherStats] of Object.entries(stats)) {
      frozenStats[origin] = Object.freeze({ ...dispatcherStats });
    }

    return Object.freeze(frozenStats);
  }

}
