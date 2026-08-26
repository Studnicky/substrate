import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Clone, SchemaIntakeError, SchemaValidator } from '@studnicky/json';
import { Predicates } from '@studnicky/types';

import { DispatcherConfigEntity } from './DispatcherConfigEntity.js';
import { FetchRequestOptionsEntity } from './FetchRequestOptionsEntity.js';

const CLIENT_CONFIG_FIELDS = new Set([
  'autoGenerateRequestId', 'baseURL', 'dispatcher', 'headers', 'hookTimeoutMs', 'metadata', 'options', 'parameters', 'timeout'
]);
const DISPATCHER_CONFIG_FIELDS = new Set([
  'allowH2', 'autoSelectFamily', 'autoSelectFamilyAttemptTimeout', 'bodyTimeout', 'clientTtl', 'connections', 'connectTimeout',
  'enabled', 'headersTimeout', 'keepAliveMaximumTimeout', 'keepAliveTimeout', 'keepAliveTimeoutThreshold', 'localAddress',
  'maximumConcurrentStreams', 'maximumHeaderSize', 'maximumOrigins', 'maximumRequestsPerClient', 'maximumResponseSize',
  'pipelining', 'strictContentLength'
]);
const DISPATCHER_BOOLEAN_FIELDS = new Set(['allowH2', 'autoSelectFamily', 'enabled', 'strictContentLength']);
const DISPATCHER_NUMBER_FIELDS = new Set([
  'autoSelectFamilyAttemptTimeout', 'bodyTimeout', 'clientTtl', 'connectTimeout', 'headersTimeout', 'keepAliveMaximumTimeout',
  'keepAliveTimeout', 'keepAliveTimeoutThreshold', 'maximumConcurrentStreams', 'maximumHeaderSize', 'maximumOrigins',
  'maximumRequestsPerClient', 'maximumResponseSize', 'pipelining'
]);
const NULLABLE_DISPATCHER_FIELDS = new Set(['clientTtl', 'maximumOrigins', 'maximumRequestsPerClient']);
const HTTP_METHODS = new Set(['CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE']);

export namespace ClientConfigDataEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ClientConfigData',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'autoGenerateRequestId': { 'type': 'boolean' },
      'baseURL': { 'format': 'uri', 'minLength': 1, 'type': 'string' },
      'dispatcher': DispatcherConfigEntity.Schema,
      'headers': {
        'additionalProperties': false,
        'patternProperties': { '^.*$': { 'type': 'string' } },
        'type': 'object'
      },
      'hookTimeoutMs': { 'exclusiveMinimum': 0, 'type': 'number' },
      'metadata': { 'type': 'object' },
      'options': FetchRequestOptionsEntity.Schema,
      'parameters': {
        'additionalProperties': false,
        'patternProperties': {
          '^.*$': {
            'anyOf': [
              { 'type': ['boolean', 'null', 'number', 'string'] },
              {
                'items': { 'type': ['boolean', 'null', 'number', 'string'] },
                'type': 'array'
              }
            ]
          }
        },
        'type': 'object'
      },
      'timeout': { 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'title': 'ClientConfigData',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  const schemaIntake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);

  class Intake {
    static parse(input: Parameters<SchemaIntakeFunctionInterface<Type>>[0]): Type {
      if (Predicates.isRecord(input)) {
        const configKeys = Object.keys(input);
        const configKeyLength = configKeys.length;
        for (let index = 0; index < configKeyLength; index += 1) {
          const key = configKeys[index];
          if (key === undefined) {
            continue;
          }
          if (!CLIENT_CONFIG_FIELDS.has(key)) {
            throw new SchemaIntakeError(`"${key}" is not declared in the schema`, [], 'ClientConfigData');
          }
        }

        const headers: unknown = Reflect.get(input, 'headers');
        if (Predicates.isRecord(headers)) {
          const headerNames = Object.keys(headers);
          const headerNameLength = headerNames.length;
          for (let index = 0; index < headerNameLength; index += 1) {
            const headerName = headerNames[index];
            if (headerName === undefined) {
              continue;
            }
            if (!Predicates.isString(Reflect.get(headers, headerName))) {
              throw new SchemaIntakeError(`header value for "${headerName}" must be a string`, [], 'ClientConfigData');
            }
          }
        }

        const dispatcher: unknown = Reflect.get(input, 'dispatcher');
        if (Predicates.isRecord(dispatcher)) {
          const dispatcherKeys = Object.keys(dispatcher);
          const dispatcherKeyLength = dispatcherKeys.length;
          for (let index = 0; index < dispatcherKeyLength; index += 1) {
            const key = dispatcherKeys[index];
            if (key === undefined) {
              continue;
            }
            if (!DISPATCHER_CONFIG_FIELDS.has(key)) {
              throw new SchemaIntakeError(`"dispatcher.${key}" is not declared in the schema`, [], 'ClientConfigData');
            }

            const value: unknown = Reflect.get(dispatcher, key);
            if (value === undefined) {
              continue;
            }
            if (DISPATCHER_BOOLEAN_FIELDS.has(key) && !Predicates.isBoolean(value)) {
              throw new SchemaIntakeError(`dispatcher.${key} must be a boolean`, [], 'ClientConfigData');
            }
            if (DISPATCHER_NUMBER_FIELDS.has(key) && value !== null && !Predicates.isNumberType(value)) {
              throw new SchemaIntakeError(`dispatcher.${key} must be a number`, [], 'ClientConfigData');
            }
            if (DISPATCHER_NUMBER_FIELDS.has(key) && value === null && !NULLABLE_DISPATCHER_FIELDS.has(key)) {
              throw new SchemaIntakeError(`dispatcher.${key} must be a number`, [], 'ClientConfigData');
            }
            if (key === 'connections' && value !== null && !Predicates.isNumberType(value)) {
              throw new SchemaIntakeError('dispatcher.connections must be a number', [], 'ClientConfigData');
            }
            if (key === 'localAddress' && value !== null && !Predicates.isString(value)) {
              throw new SchemaIntakeError('dispatcher.localAddress must be a string', [], 'ClientConfigData');
            }
          }
        }
      }

      const normalized = Clone.deep(input);
      if (Predicates.isRecord(normalized)) {
        const dispatcher: unknown = Reflect.get(normalized, 'dispatcher');
        if (Predicates.isRecord(dispatcher)) {
          const dispatcherKeys = Object.keys(dispatcher);
          const normalizedDispatcher: Record<string, unknown> = {};
          const dispatcherKeyLength = dispatcherKeys.length;
          for (let index = 0; index < dispatcherKeyLength; index += 1) {
            const key = dispatcherKeys[index];
            if (key === undefined) {
              continue;
            }
            const value: unknown = Reflect.get(dispatcher, key);
            if (value === undefined || (value === null && (NULLABLE_DISPATCHER_FIELDS.has(key) || key === 'connections' || key === 'localAddress'))) {
              continue;
            }
            Reflect.set(normalizedDispatcher, key, value);
          }
          Reflect.set(normalized, 'dispatcher', normalizedDispatcher);
        }

        const parameters: unknown = Reflect.get(normalized, 'parameters');
        if (Predicates.isRecord(parameters)) {
          const parameterKeys = Object.keys(parameters);
          const normalizedParameters: Record<string, unknown> = {};
          const parameterKeyLength = parameterKeys.length;
          for (let index = 0; index < parameterKeyLength; index += 1) {
            const key = parameterKeys[index];
            if (key === undefined) {
              continue;
            }
            const value: unknown = Reflect.get(parameters, key);
            if (value !== undefined) {
              Reflect.set(normalizedParameters, key, value);
            }
          }
          Reflect.set(normalized, 'parameters', normalizedParameters);
        }
      }

      const result = schemaIntake(normalized);

      if (result.baseURL !== undefined) {
        try {
          new URL(result.baseURL);
        } catch {
          throw new SchemaIntakeError('baseURL must be a valid URL', [], 'ClientConfigData');
        }
      }

      const method = result.options?.method;
      if (method !== undefined && !HTTP_METHODS.has(method.toUpperCase())) {
        throw new SchemaIntakeError('options.method must be a valid HTTP method', [], 'ClientConfigData');
      }

      return result;
    }
  }
  export const intake: SchemaIntakeFunctionInterface<Type> = Intake.parse;
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
