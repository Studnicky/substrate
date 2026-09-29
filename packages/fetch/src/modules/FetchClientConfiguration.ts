import { SchemaIntakeError } from '@studnicky/entity/browser';
import { RuntimeError } from '@studnicky/errors/browser';
import { Clone } from '@studnicky/json/browser';
import { Predicates } from '@studnicky/types/browser';

import type { QueryParametersEntity } from '../entities/QueryParametersEntity.js';
import type { ClientConfigInterface } from '../interfaces/ClientConfigInterface.js';
import type { ConfigurationCollaboratorsInterface } from '../interfaces/ConfigurationCollaboratorsInterface.js';
import type { FetchOptionsInterface } from '../interfaces/FetchOptionsInterface.js';
import type { ResolvedClientConfigInterface } from '../interfaces/ResolvedClientConfigInterface.js';

import { ClientConfigDataEntity } from '../entities/ClientConfigDataEntity.js';
import { ConfigurationError } from '../errors/ConfigurationError.js';
import { UrlQueryString } from './UrlQueryString.js';

interface FetchClientConfigurationResultInterface {
  readonly 'config': ResolvedClientConfigInterface;
  readonly 'queryParameters': QueryParametersEntity.Type | undefined;
}

interface RuntimeOptionValuesInterface {
  readonly 'body': unknown;
  readonly 'dispatcher': unknown;
  readonly 'json': unknown;
  readonly 'signal': AbortSignal | undefined;
}

/** Normalizes schema data and snapshots runtime values for both fetch clients. */
export class FetchClientConfiguration {
  public static intake(config: unknown, collaborators: ConfigurationCollaboratorsInterface = {}): FetchClientConfigurationResultInterface {
    if (!Predicates.isRecord(config)) {
      throw new ConfigurationError('config must be an object');
    }

    const {
      'clock': _clock,
      'options': configuredOptions,
      'parameters': runtimeParameters,
      'requestIdGenerator': _requestIdGenerator,
      'signal': _signal,
      ...configData
    } = config;
    const { clock, requestIdGenerator, 'signal': signalComposer } = collaborators;

    FetchClientConfiguration.assertTimeout(configData.hookTimeoutMs, 'hookTimeoutMs', false);
    FetchClientConfiguration.assertTimeout(configData.timeout, 'timeout', true);

    const queryParameters = FetchClientConfiguration.intakeQueryParameters(runtimeParameters);
    const optionValues = FetchClientConfiguration.partitionOptions(configuredOptions);
    const data = configuredOptions === undefined
      ? configData
      : { ...configData, 'options': optionValues.data };
    const parsed = FetchClientConfiguration.intakeData(data);
    const options = FetchClientConfiguration.buildRuntimeOptions(parsed.options, optionValues.runtime);
    const normalized = FetchClientConfiguration.buildNormalizedConfig(parsed, options, clock, requestIdGenerator, signalComposer);

    return { 'config': normalized, 'queryParameters': queryParameters };
  }

  /** Extracts the typed collaborators `ClientConfigInterface` carries alongside schema data. */
  public static collaboratorsFrom(config: ClientConfigInterface): ConfigurationCollaboratorsInterface {
    return {
      ...(config.clock === undefined ? {} : { 'clock': config.clock }),
      ...(config.requestIdGenerator === undefined ? {} : { 'requestIdGenerator': config.requestIdGenerator }),
      ...(config.signal === undefined ? {} : { 'signal': config.signal })
    };
  }

  private static buildRuntimeOptions(
    parsedOptions: FetchOptionsInterface | undefined,
    runtime: RuntimeOptionValuesInterface
  ): FetchOptionsInterface | undefined {
    if (parsedOptions === undefined) {
      return undefined;
    }
    const result = FetchClientConfiguration.snapshotOptions({
      ...parsedOptions,
      ...(runtime.body === undefined ? {} : { 'body': runtime.body }),
      ...(runtime.dispatcher === undefined ? {} : { 'dispatcher': runtime.dispatcher }),
      ...(runtime.json === undefined ? {} : { 'json': runtime.json }),
      ...(runtime.signal === undefined ? {} : { 'signal': runtime.signal })
    });
    return result;
  }

  private static buildNormalizedConfig(
    parsed: ClientConfigDataEntity.Type,
    options: FetchOptionsInterface | undefined,
    clock: ConfigurationCollaboratorsInterface['clock'],
    requestIdGenerator: ConfigurationCollaboratorsInterface['requestIdGenerator'],
    signalComposer: ConfigurationCollaboratorsInterface['signal']
  ): ResolvedClientConfigInterface {
    return {
      ...parsed,
      ...(clock === undefined ? {} : { 'clock': clock }),
      ...(options === undefined ? {} : { 'options': options }),
      ...(requestIdGenerator === undefined ? {} : { 'requestIdGenerator': requestIdGenerator }),
      ...(signalComposer === undefined ? {} : { 'signal': signalComposer })
    };
  }

  private static assertTimeout(value: unknown, name: string, requiresInteger: boolean): void {
    if (value === undefined) {
      return;
    }
    if (!Predicates.isNumberType(value)) {
      throw new ConfigurationError(`${name} must be a number`);
    }
    if (value <= 0) {
      throw new ConfigurationError(`${name} must be positive`);
    }
    if (!Number.isFinite(value)) {
      throw new ConfigurationError(`${name} must be finite`);
    }
    if (requiresInteger && !Number.isInteger(value)) {
      throw new ConfigurationError(`${name} must be an integer`);
    }
  }

  private static intakeQueryParameters(parameters: unknown): QueryParametersEntity.Type | undefined {
    if (parameters === undefined) {
      return undefined;
    }
    try {
      const queryParameters = UrlQueryString.intakeParameters(parameters);
      return queryParameters;
    } catch (error) {
      if (error instanceof SchemaIntakeError) {
        throw new ConfigurationError(RuntimeError.toMessage(error));
      }
      throw error;
    }
  }

  private static partitionOptions(options: unknown): {
    readonly 'data': Record<string, unknown>;
    readonly 'runtime': RuntimeOptionValuesInterface;
  } {
    if (options === undefined) {
      return {
        'data': {},
        'runtime': {
          'body': undefined,
          'dispatcher': undefined,
          'json': undefined,
          'signal': undefined
        }
      };
    }
    if (!Predicates.isRecord(options)) {
      throw new ConfigurationError('options must be an object');
    }

    const {
      body,
      dispatcher,
      json,
      signal,
      ...data
    } = options;
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
      throw new ConfigurationError('signal must be an AbortSignal instance');
    }

    FetchClientConfiguration.assertTimeout(data.timeout, 'timeout', true);

    return {
      'data': data,
      'runtime': {
        'body': body,
        'dispatcher': dispatcher,
        'json': json,
        'signal': signal
      }
    };
  }

  private static intakeData(data: Record<string, unknown>): ClientConfigDataEntity.Type {
    try {
      const entity = ClientConfigDataEntity.intake(data);
      return entity;
    } catch (error) {
      if (error instanceof SchemaIntakeError) {
        throw new ConfigurationError(RuntimeError.toMessage(error));
      }
      throw error;
    }
  }

  private static snapshotOptions(options: FetchOptionsInterface): FetchOptionsInterface {
    let body = options.body;
    if (body instanceof ArrayBuffer) {
      body = body.slice(0);
    } else if (body instanceof Uint8Array) {
      body = Uint8Array.from(body);
    }

    const json = options.json;
    const snapshotJson = Predicates.isObjectLike(json)
      && Object.getPrototypeOf(json) !== Object.prototype
      && Object.getPrototypeOf(json) !== null
      ? json
      : Clone.deep(json);
    return {
      ...options,
      ...(body === undefined ? {} : { 'body': body }),
      ...(options.headers === undefined ? {} : { 'headers': { ...options.headers } }),
      ...(json === undefined ? {} : { 'json': snapshotJson }),
      ...(options.metadata === undefined ? {} : { 'metadata': Clone.deep(options.metadata) })
    };
  }
}
