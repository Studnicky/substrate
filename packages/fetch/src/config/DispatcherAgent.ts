import { Agent } from 'undici';

import type { DispatcherConfigEntity } from '../entities/DispatcherConfigEntity.js';
import type { MergedConfigEntity } from '../entities/MergedConfigEntity.js';

import { DEFAULT_DISPATCHER_CONFIG } from '../constants/DEFAULT_DISPATCHER_CONFIG.js';

/** Creates configured undici Agents for owners that retain and manage them. */
export class DispatcherAgent {
  private constructor() {
    throw new TypeError('DispatcherAgent is a static factory');
  }

  static create(config: DispatcherConfigEntity.Type): Agent {
    const merged = DispatcherAgent.#mergeWithDefaults(config);
    const options: Record<string, unknown> = { 'pipelining': merged.pipelining };

    DispatcherAgent.#setIfNotNull(options, 'connections', merged.connections);
    DispatcherAgent.#setIfDefined(options, 'clientTtl', config.clientTtl);
    DispatcherAgent.#setIfTruthy(options, 'connectTimeout', merged.connectTimeout);
    DispatcherAgent.#setIfTruthy(options, 'bodyTimeout', merged.bodyTimeout);
    DispatcherAgent.#setIfTruthy(options, 'headersTimeout', merged.headersTimeout);
    DispatcherAgent.#setIfTruthy(options, 'keepAliveTimeout', merged.keepAliveTimeout);
    DispatcherAgent.#setIfTruthy(options, 'keepAliveMaxTimeout', merged.keepAliveMaxTimeout);
    DispatcherAgent.#setIfTruthy(options, 'keepAliveTimeoutThreshold', merged.keepAliveTimeoutThreshold);
    if (merged.allowH2) {
      options.allowH2 = true;
      DispatcherAgent.#setIfTruthy(options, 'maxConcurrentStreams', merged.maxConcurrentStreams);
    }
    DispatcherAgent.#setIfPositive(options, 'maxResponseSize', merged.maxResponseSize);
    DispatcherAgent.#setIfTruthy(options, 'maxHeaderSize', merged.maxHeaderSize);
    DispatcherAgent.#setIfDefined(options, 'maxRequestsPerClient', config.maxRequestsPerClient);
    options.strictContentLength = merged.strictContentLength;
    DispatcherAgent.#setIfDefined(options, 'localAddress', config.localAddress);
    if (merged.autoSelectFamily) {
      options.autoSelectFamily = true;
      DispatcherAgent.#setIfTruthy(options, 'autoSelectFamilyAttemptTimeout', merged.autoSelectFamilyAttemptTimeout);
    }
    DispatcherAgent.#setIfDefined(options, 'maxOrigins', config.maxOrigins);

    return new Agent(options);
  }

  static #mergeWithDefaults(config: DispatcherConfigEntity.Type): MergedConfigEntity.Type {
    return {
      'allowH2': config.allowH2 ?? DEFAULT_DISPATCHER_CONFIG.allowH2,
      'autoSelectFamily': config.autoSelectFamily ?? DEFAULT_DISPATCHER_CONFIG.autoSelectFamily,
      'autoSelectFamilyAttemptTimeout': config.autoSelectFamilyAttemptTimeout ?? DEFAULT_DISPATCHER_CONFIG.autoSelectFamilyAttemptTimeout,
      'bodyTimeout': config.bodyTimeout ?? DEFAULT_DISPATCHER_CONFIG.bodyTimeout,
      'connections': config.connections === undefined ? DEFAULT_DISPATCHER_CONFIG.connections : config.connections,
      'connectTimeout': config.connectTimeout ?? DEFAULT_DISPATCHER_CONFIG.connectTimeout,
      'headersTimeout': config.headersTimeout ?? DEFAULT_DISPATCHER_CONFIG.headersTimeout,
      'keepAliveMaxTimeout': config.keepAliveMaxTimeout ?? DEFAULT_DISPATCHER_CONFIG.keepAliveMaxTimeout,
      'keepAliveTimeout': config.keepAliveTimeout ?? DEFAULT_DISPATCHER_CONFIG.keepAliveTimeout,
      'keepAliveTimeoutThreshold': config.keepAliveTimeoutThreshold ?? DEFAULT_DISPATCHER_CONFIG.keepAliveTimeoutThreshold,
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
  }

  static #setIfTruthy(options: Record<string, unknown>, key: string, value: unknown): void {
    if (value !== undefined && value !== null && value !== 0 && value !== '') { options[key] = value; }
  }

  static #setIfDefined(options: Record<string, unknown>, key: string, value: unknown): void {
    if (value !== undefined) { options[key] = value; }
  }

  static #setIfNotNull(options: Record<string, unknown>, key: string, value: unknown): void {
    if (value !== null) { options[key] = value; }
  }

  static #setIfPositive(options: Record<string, unknown>, key: string, value: number | undefined): void {
    if (value !== undefined && value > 0) { options[key] = value; }
  }
}
