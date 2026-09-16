import { SchemaIntakeError } from '@studnicky/entity/node';
import { RuntimeError } from '@studnicky/errors/node';
import { Clone } from '@studnicky/json/node';
import { Predicates } from '@studnicky/types/node';

import type { QueryParametersEntity } from '../entities/QueryParametersEntity.js';
import type { ClientConfigInterface } from '../interfaces/ClientConfigInterface.js';
import type { FetchOptionsInterface } from '../interfaces/FetchOptionsInterface.js';

import { ClientConfigDataEntity } from '../entities/ClientConfigDataEntity.js';
import { ConfigurationError } from '../errors/ConfigurationError.js';
import { UrlQueryString } from './UrlQueryString.js';

interface FetchClientConfigurationResultInterface {
  readonly 'config': ClientConfigInterface;
  readonly 'queryParameters': QueryParametersEntity.Type | undefined;
}

interface RuntimeOptionValuesInterface {
  readonly 'body': FetchOptionsInterface['body'] | undefined;
  readonly 'dispatcher': unknown;
  readonly 'json': unknown;
  readonly 'signal': AbortSignal | undefined;
}

/** Normalizes schema data and snapshots runtime values for both fetch clients. */
export class FetchClientConfiguration {
  public static intake(config: ClientConfigInterface): FetchClientConfigurationResultInterface {
    if (!Predicates.isRecord(config)) {
      throw new ConfigurationError('config must be an object');
    }

    const {
      clock,
      'options': configuredOptions,
      'parameters': runtimeParameters,
      requestIdGenerator,
      'signal': signalComposer,
      ...configData
    } = config;

    FetchClientConfiguration.assertTimeout(configData.hookTimeoutMs, 'hookTimeoutMs', false);
    FetchClientConfiguration.assertTimeout(configData.timeout, 'timeout', true);

    const queryParameters = FetchClientConfiguration.intakeQueryParameters(runtimeParameters);
    const optionValues = FetchClientConfiguration.partitionOptions(configuredOptions);
    const data = configuredOptions === undefined
      ? configData
      : { ...configData, 'options': optionValues.data };
    const parsed = FetchClientConfiguration.intakeData(data);
    const options = parsed.options === undefined
      ? undefined
      : FetchClientConfiguration.snapshotOptions({
        ...parsed.options,
        ...(optionValues.runtime.body === undefined ? {} : { 'body': optionValues.runtime.body }),
        ...(optionValues.runtime.dispatcher === undefined ? {} : { 'dispatcher': optionValues.runtime.dispatcher }),
        ...(optionValues.runtime.json === undefined ? {} : { 'json': optionValues.runtime.json }),
        ...(optionValues.runtime.signal === undefined ? {} : { 'signal': optionValues.runtime.signal })
      });
    const normalized: ClientConfigInterface = {
      ...parsed,
      ...(clock === undefined ? {} : { 'clock': clock }),
      ...(options === undefined ? {} : { 'options': options }),
      ...(requestIdGenerator === undefined ? {} : { 'requestIdGenerator': requestIdGenerator }),
      ...(signalComposer === undefined ? {} : { 'signal': signalComposer })
    };

    return { 'config': normalized, 'queryParameters': queryParameters };
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

  private static partitionOptions(options: FetchOptionsInterface | undefined): {
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
    if (signal !== undefined && !Predicates.isAbortSignal(signal)) {
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
