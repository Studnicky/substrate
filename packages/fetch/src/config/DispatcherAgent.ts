import { JsonObject } from '@studnicky/types/node';
import { Agent } from 'undici';

import type { DispatcherConfigEntity } from '../entities/DispatcherConfigEntity.js';

import { DEFAULT_DISPATCHER_CONFIG } from '../constants/DEFAULT_DISPATCHER_CONFIG.js';
import { MergedConfigEntity } from '../entities/MergedConfigEntity.js';
import { ConfigurationError, ConstructionError } from '../errors/index.js';
import { TestDispatcher } from '../testing/TestDispatcher.js';

interface ConnectionDefaultsInterface {
  'allowH2': MergedConfigEntity.InputType['allowH2'];
  'autoSelectFamily': MergedConfigEntity.InputType['autoSelectFamily'];
  'autoSelectFamilyAttemptTimeout': MergedConfigEntity.InputType['autoSelectFamilyAttemptTimeout'];
  'connections': MergedConfigEntity.InputType['connections'];
  'pipelining': MergedConfigEntity.InputType['pipelining'];
}

interface TimingDefaultsInterface {
  'bodyTimeout': MergedConfigEntity.InputType['bodyTimeout'];
  'connectTimeout': MergedConfigEntity.InputType['connectTimeout'];
  'headersTimeout': MergedConfigEntity.InputType['headersTimeout'];
  'keepAliveMaximumTimeout': MergedConfigEntity.InputType['keepAliveMaximumTimeout'];
  'keepAliveTimeout': MergedConfigEntity.InputType['keepAliveTimeout'];
  'keepAliveTimeoutThreshold': MergedConfigEntity.InputType['keepAliveTimeoutThreshold'];
}

interface LimitDefaultsInterface {
  'maximumConcurrentStreams': MergedConfigEntity.InputType['maximumConcurrentStreams'];
  'maximumHeaderSize': MergedConfigEntity.InputType['maximumHeaderSize'];
  'maximumResponseSize': MergedConfigEntity.InputType['maximumResponseSize'];
  'strictContentLength': MergedConfigEntity.InputType['strictContentLength'];
}

/** Creates configured undici Agents for owners that retain and manage them. */
export class DispatcherAgent {
  private constructor() {
    throw new ConstructionError('DispatcherAgent is a static factory');
  }

  static create(config: DispatcherConfigEntity.InputType): Agent | TestDispatcher {
    if (process.env.SUBSTRATE_FETCH_TEST_TRANSPORT === '1') {
      const result = TestDispatcher.create(config);
      return result;
    }

    const merged = DispatcherAgent.#mergeWithDefaults(config);
    const options: Record<string, unknown> = { 'pipelining': merged.pipelining };

    DispatcherAgent.#setIfNotNull(options, 'connections', merged.connections);
    DispatcherAgent.#setIfDefined(options, 'clientTtl', config.clientTtl);
    DispatcherAgent.#setIfTruthy(options, 'connectTimeout', merged.connectTimeout);
    DispatcherAgent.#setIfTruthy(options, 'bodyTimeout', merged.bodyTimeout);
    DispatcherAgent.#setIfTruthy(options, 'headersTimeout', merged.headersTimeout);
    DispatcherAgent.#setIfTruthy(options, 'keepAliveTimeout', merged.keepAliveTimeout);
    DispatcherAgent.#setIfTruthy(options, 'keepAliveMaxTimeout', merged.keepAliveMaximumTimeout);
    DispatcherAgent.#setIfTruthy(options, 'keepAliveTimeoutThreshold', merged.keepAliveTimeoutThreshold);
    if (merged.allowH2) {
      options.allowH2 = true;
      DispatcherAgent.#setIfTruthy(options, 'maxConcurrentStreams', merged.maximumConcurrentStreams);
    }
    DispatcherAgent.#setIfPositive(options, 'maxResponseSize', merged.maximumResponseSize);
    DispatcherAgent.#setIfTruthy(options, 'maxHeaderSize', merged.maximumHeaderSize);
    DispatcherAgent.#setIfDefined(options, 'maxRequestsPerClient', config.maximumRequestsPerClient);
    options.strictContentLength = merged.strictContentLength;
    DispatcherAgent.#setIfDefined(options, 'localAddress', config.localAddress);
    if (merged.autoSelectFamily) {
      options.autoSelectFamily = true;
      DispatcherAgent.#setIfTruthy(options, 'autoSelectFamilyAttemptTimeout', merged.autoSelectFamilyAttemptTimeout);
    }
    DispatcherAgent.#setIfDefined(options, 'maxOrigins', config.maximumOrigins);

    try {
      const result = new Agent(options);
      return result;
    } catch (cause) {
      throw new ConfigurationError('undici Agent rejected the dispatcher configuration', cause);
    }
  }

  static #mergeWithDefaults(config: DispatcherConfigEntity.InputType): MergedConfigEntity.Type {
    const draft: Record<string, unknown> = {
      ...DispatcherAgent.#mergeConnectionDefaults(config),
      ...DispatcherAgent.#mergeTimingDefaults(config),
      ...DispatcherAgent.#mergeLimitDefaults(config)
    };
    DispatcherAgent.#applyOptionalOverrides(draft, config);
    const merged = MergedConfigEntity.create(draft);
    return merged;
  }

  static #mergeConnectionDefaults(
    config: DispatcherConfigEntity.InputType
  ): ConnectionDefaultsInterface {
    return {
      'allowH2': config.allowH2 ?? DEFAULT_DISPATCHER_CONFIG.allowH2,
      'autoSelectFamily': config.autoSelectFamily ?? DEFAULT_DISPATCHER_CONFIG.autoSelectFamily,
      'autoSelectFamilyAttemptTimeout': config.autoSelectFamilyAttemptTimeout ?? DEFAULT_DISPATCHER_CONFIG.autoSelectFamilyAttemptTimeout,
      'connections': config.connections === undefined ? DEFAULT_DISPATCHER_CONFIG.connections : config.connections,
      'pipelining': config.pipelining ?? DEFAULT_DISPATCHER_CONFIG.pipelining
    };
  }

  static #mergeTimingDefaults(
    config: DispatcherConfigEntity.InputType
  ): TimingDefaultsInterface {
    return {
      'bodyTimeout': config.bodyTimeout ?? DEFAULT_DISPATCHER_CONFIG.bodyTimeout,
      'connectTimeout': config.connectTimeout ?? DEFAULT_DISPATCHER_CONFIG.connectTimeout,
      'headersTimeout': config.headersTimeout ?? DEFAULT_DISPATCHER_CONFIG.headersTimeout,
      'keepAliveMaximumTimeout': config.keepAliveMaximumTimeout ?? DEFAULT_DISPATCHER_CONFIG.keepAliveMaximumTimeout,
      'keepAliveTimeout': config.keepAliveTimeout ?? DEFAULT_DISPATCHER_CONFIG.keepAliveTimeout,
      'keepAliveTimeoutThreshold': config.keepAliveTimeoutThreshold ?? DEFAULT_DISPATCHER_CONFIG.keepAliveTimeoutThreshold
    };
  }

  static #mergeLimitDefaults(
    config: DispatcherConfigEntity.InputType
  ): LimitDefaultsInterface {
    return {
      'maximumConcurrentStreams': config.maximumConcurrentStreams ?? DEFAULT_DISPATCHER_CONFIG.maximumConcurrentStreams,
      'maximumHeaderSize': config.maximumHeaderSize ?? DEFAULT_DISPATCHER_CONFIG.maximumHeaderSize,
      'maximumResponseSize': config.maximumResponseSize ?? DEFAULT_DISPATCHER_CONFIG.maximumResponseSize,
      'strictContentLength': config.strictContentLength ?? DEFAULT_DISPATCHER_CONFIG.strictContentLength
    };
  }

  /** Optional fields default to absent, not to a fallback value — undefined/null stay unset. */
  static #applyOptionalOverrides(draft: Record<string, unknown>, config: DispatcherConfigEntity.InputType): void {
    DispatcherAgent.#setIfDefined(draft, 'clientTtl', config.clientTtl);
    if (config.enabled !== undefined) { JsonObject.write(draft, 'enabled', config.enabled); }
    DispatcherAgent.#setIfDefined(draft, 'localAddress', config.localAddress);
    DispatcherAgent.#setIfDefined(draft, 'maximumOrigins', config.maximumOrigins);
    DispatcherAgent.#setIfDefined(draft, 'maximumRequestsPerClient', config.maximumRequestsPerClient);
  }

  static #setIfTruthy(options: Record<string, unknown>, key: string, value: number | undefined): void {
    if (value !== undefined && value !== 0) { JsonObject.write(options, key, value); }
  }

  static #setIfDefined(options: Record<string, unknown>, key: string, value: number | string | null | undefined): void {
    if (value !== undefined && value !== null) { JsonObject.write(options, key, value); }
  }

  static #setIfNotNull(options: Record<string, unknown>, key: string, value: number | null): void {
    if (value !== null) { JsonObject.write(options, key, value); }
  }

  static #setIfPositive(options: Record<string, unknown>, key: string, value: number | undefined): void {
    if (value !== undefined && value > 0) { JsonObject.write(options, key, value); }
  }
}
