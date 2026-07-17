/**
 * Undici Dispatcher for connection pooling
 * Wraps undici Agent with validated configuration
 */


import { Agent } from 'undici';

import type { DestroyOptionsEntity } from '../entities/DestroyOptionsEntity.js';
import type { DispatcherConfigEntity } from '../entities/DispatcherConfigEntity.js';
import type { DispatcherHealthEntity } from '../entities/DispatcherHealthEntity.js';
import type { MergedConfigEntity } from '../entities/MergedConfigEntity.js';
import type { SocketDispatcherStatsEntity } from '../entities/SocketDispatcherStatsEntity.js';
import type { UndiciDispatcherInterface } from '../interfaces/UndiciDispatcherInterface.js';

import { validateDispatcher } from '../config/schemas/validateDispatcher.js';
import { DEFAULT_DISPATCHER_CONFIG } from '../constants/DEFAULT_DISPATCHER_CONFIG.js';
import {
  POOL_OVERLOAD_MULTIPLIER,
  POOL_OVERLOAD_THRESHOLD,
  POOL_PRESSURE_MULTIPLIER,
  POOL_PRESSURE_THRESHOLD
} from '../constants/POOL_HEALTH.js';
import { ConfigurationError } from '../errors/index.js';
import { Delay } from './Delay.js';
import { UndiciDispatcherBuilder } from './UndiciDispatcherBuilder.js';

type OptionsRecordType = Record<string, unknown>;

/**
 * Dispatcher for HTTP connection pooling using undici Agent
 *
 * The Agent manages connection pools across multiple origins (hosts).
 * Each origin gets its own Pool with the specified configuration.
 */
export class UndiciDispatcher implements UndiciDispatcherInterface {
  /**
   * Create a configured undici dispatcher for connection pooling
   *
   * @param config - Dispatcher configuration (validated in constructor)
   * @returns UndiciDispatcher instance
   *
   * @example
   * ```typescript
   * import { UndiciDispatcher } from '@studnicky/fetch';
   *
   * const dispatcher = UndiciDispatcher.create({
   *   connections: 20,
   *   pipelining: 1,
   *   keepAliveTimeout: 60000
   * });
   *
   * // Use with fetch
   * const response = await fetch('https://api.example.com/data', {
   *   dispatcher: dispatcher.getAgent()
   * });
   *
   * // Cleanup when done
   * dispatcher.destroy();
   * ```
   *
   * @example With FetchClient
   * ```typescript
   * import { FetchClient, UndiciDispatcher } from '@studnicky/fetch';
   *
   * const dispatcher = UndiciDispatcher.create({ connections: 50 });
   *
   * const client = FetchClient.create({
   *   baseURL: 'https://api.example.com',
   *   options: { dispatcher: dispatcher.getAgent() }
   * });
   *
   * const response = await client.get('/users');
   * ```
   */
  static create(config: DispatcherConfigEntity.Type = {}): UndiciDispatcher {
    return new this(config);
  }

  static builder(): UndiciDispatcherBuilder {
    const result = UndiciDispatcherBuilder.create((options) => {
      const dispatcher = UndiciDispatcher.create(options);
      return dispatcher;
    });
    return result;
  }

  private readonly abortController: AbortController;

  private readonly agent: Agent;

  /**
   * Protected constructor - use UndiciDispatcher.create() instead
   *
   * @param config - Dispatcher configuration (validated in constructor)
   */
  protected constructor(config: DispatcherConfigEntity.Type) {
    if (typeof config !== 'object' || Array.isArray(config)) {
      throw new ConfigurationError('dispatcher configuration must be an object');
    }

    validateDispatcher(config);

    this.abortController = new AbortController();
    this.agent = new Agent(UndiciDispatcher.toAgentOptions(config));
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
   *
   * const dispatcher = UndiciDispatcher.create({ connections: 20 });
   *
   * // Make some requests...
   * await fetch('https://api.example.com/data', {
   *   dispatcher: dispatcher.getAgent()
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
    const stats = this.agent.stats[origin] as SocketDispatcherStatsEntity.Type | undefined;

    if (stats === undefined) {
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
   * const dispatcher = UndiciDispatcher.create({ connections: 10 });
   *
   * // Start a slow request
   * const request = fetch('https://api.example.com/slow', {
   *   dispatcher: dispatcher.getAgent(),
   *   signal: dispatcher.getSignal()
   * });
   *
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

    this.abortController.abort();
    await this.agent.destroy();
  }

  /**
   * Get the underlying undici Agent
   *
   * @returns Undici Agent instance
   */
  getAgent(): Agent {
    const result = this.agent;
    return result;
  }

  /**
   * Get the dispatcher's abort signal
   *
   * @returns AbortSignal that's aborted on destroy()
   *
   * @example
   * ```typescript
   * const dispatcher = UndiciDispatcher.create({ connections: 10 });
   *
   * const response = await fetch('https://api.example.com/data', {
   *   dispatcher: dispatcher.getAgent(),
   *   signal: dispatcher.getSignal()
   * });
   *
   * await dispatcher.destroy();
   * ```
   *
   * @example Combining with timeout signal
   * ```typescript
   * const dispatcher = UndiciDispatcher.create({ connections: 10 });
   * const timeoutController = new AbortController();
   *
   * const combinedSignal = AbortSignal.any([
   *   dispatcher.getSignal(),
   *   timeoutController.signal
   * ]);
   *
   * setTimeout(() => timeoutController.abort(), 5000);
   *
   * const response = await fetch('https://api.example.com/data', {
   *   dispatcher: dispatcher.getAgent(),
   *   signal: combinedSignal
   * });
   * ```
   */
  getSignal(): AbortSignal {
    const result = this.abortController.signal;
    return result;
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

  private static mergeWithDefaults(config: DispatcherConfigEntity.Type): MergedConfigEntity.Type {
    const merged: MergedConfigEntity.Type = {
      'allowH2': config.allowH2 ?? DEFAULT_DISPATCHER_CONFIG.allowH2,
      'autoSelectFamily': config.autoSelectFamily ?? DEFAULT_DISPATCHER_CONFIG.autoSelectFamily,
      'autoSelectFamilyAttemptTimeout':
        config.autoSelectFamilyAttemptTimeout ?? DEFAULT_DISPATCHER_CONFIG.autoSelectFamilyAttemptTimeout,
      'bodyTimeout': config.bodyTimeout ?? DEFAULT_DISPATCHER_CONFIG.bodyTimeout,
      'connections': config.connections === undefined ? DEFAULT_DISPATCHER_CONFIG.connections : config.connections,
      'connectTimeout': config.connectTimeout ?? DEFAULT_DISPATCHER_CONFIG.connectTimeout,
      'headersTimeout': config.headersTimeout ?? DEFAULT_DISPATCHER_CONFIG.headersTimeout,
      'keepAliveMaxTimeout': config.keepAliveMaxTimeout ?? DEFAULT_DISPATCHER_CONFIG.keepAliveMaxTimeout,
      'keepAliveTimeout': config.keepAliveTimeout ?? DEFAULT_DISPATCHER_CONFIG.keepAliveTimeout,
      'keepAliveTimeoutThreshold':
        config.keepAliveTimeoutThreshold ?? DEFAULT_DISPATCHER_CONFIG.keepAliveTimeoutThreshold,
      'maxConcurrentStreams': config.maxConcurrentStreams ?? DEFAULT_DISPATCHER_CONFIG.maxConcurrentStreams,
      'maxHeaderSize': config.maxHeaderSize ?? DEFAULT_DISPATCHER_CONFIG.maxHeaderSize,
      'maxResponseSize': config.maxResponseSize ?? DEFAULT_DISPATCHER_CONFIG.maxResponseSize,
      'pipelining': config.pipelining ?? DEFAULT_DISPATCHER_CONFIG.pipelining,
      'strictContentLength': config.strictContentLength ?? DEFAULT_DISPATCHER_CONFIG.strictContentLength,
      ...(config.clientTtl !== undefined && { 'clientTtl': config.clientTtl }),
      ...(config.enabled !== undefined && { 'enabled': config.enabled }),
      ...(config.localAddress !== undefined && { 'localAddress': config.localAddress }),
      ...(config.maxOrigins !== undefined && { 'maxOrigins': config.maxOrigins }),
      ...(config.maxRequestsPerClient !== undefined && { 'maxRequestsPerClient': config.maxRequestsPerClient })
    };
    return merged;
  }

  private static setIfTruthy(options: OptionsRecordType, key: string, value: unknown): void {
    if (value !== undefined && value !== null && value !== 0 && value !== '') {
      options[key] = value;
    }
  }

  private static setIfDefined(options: OptionsRecordType, key: string, value: unknown): void {
    if (value !== undefined) {
      options[key] = value;
    }
  }

  private static setIfNotNull(options: OptionsRecordType, key: string, value: unknown): void {
    if (value !== null) {
      options[key] = value;
    }
  }

  private static setIfPositive(options: OptionsRecordType, key: string, value: number | undefined): void {
    if (value !== undefined && value > 0) {
      options[key] = value;
    }
  }

  private static toAgentOptions(config: DispatcherConfigEntity.Type): Agent.Options {
    const merged = UndiciDispatcher.mergeWithDefaults(config);
    const options: OptionsRecordType = { 'pipelining': merged.pipelining };

    UndiciDispatcher.setIfNotNull(options, 'connections', merged.connections);
    UndiciDispatcher.setIfDefined(options, 'clientTtl', config.clientTtl);

    UndiciDispatcher.setIfTruthy(options, 'connectTimeout', merged.connectTimeout);
    UndiciDispatcher.setIfTruthy(options, 'bodyTimeout', merged.bodyTimeout);
    UndiciDispatcher.setIfTruthy(options, 'headersTimeout', merged.headersTimeout);
    UndiciDispatcher.setIfTruthy(options, 'keepAliveTimeout', merged.keepAliveTimeout);
    UndiciDispatcher.setIfTruthy(options, 'keepAliveMaxTimeout', merged.keepAliveMaxTimeout);
    UndiciDispatcher.setIfTruthy(options, 'keepAliveTimeoutThreshold', merged.keepAliveTimeoutThreshold);

    if (merged.allowH2) {
      options.allowH2 = true;
      UndiciDispatcher.setIfTruthy(options, 'maxConcurrentStreams', merged.maxConcurrentStreams);
    }

    UndiciDispatcher.setIfPositive(options, 'maxResponseSize', merged.maxResponseSize);
    UndiciDispatcher.setIfTruthy(options, 'maxHeaderSize', merged.maxHeaderSize);

    UndiciDispatcher.setIfDefined(options, 'maxRequestsPerClient', config.maxRequestsPerClient);
    options.strictContentLength = merged.strictContentLength;
    UndiciDispatcher.setIfDefined(options, 'localAddress', config.localAddress);

    if (merged.autoSelectFamily) {
      options.autoSelectFamily = true;
      UndiciDispatcher.setIfTruthy(options, 'autoSelectFamilyAttemptTimeout', merged.autoSelectFamilyAttemptTimeout);
    }

    UndiciDispatcher.setIfDefined(options, 'maxOrigins', config.maxOrigins);

    return options;
  }
}
