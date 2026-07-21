import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/**
 * Dispatcher configuration merged with defaults, ready to translate into
 * undici Agent options.
 */
export namespace MergedConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/MergedConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Dispatcher configuration merged with defaults',
    'properties': {
      'allowH2': { 'type': 'boolean' },
      'autoSelectFamily': { 'type': 'boolean' },
      'autoSelectFamilyAttemptTimeout': { 'minimum': 0, 'type': 'number' },
      'bodyTimeout': { 'minimum': 0, 'type': 'number' },
      'clientTtl': { 'minimum': 0, 'type': 'number' },
      'connections': { 'type': ['integer', 'null'] },
      'connectTimeout': { 'minimum': 0, 'type': 'number' },
      'enabled': { 'type': 'boolean' },
      'headersTimeout': { 'minimum': 0, 'type': 'number' },
      'keepAliveMaxTimeout': { 'minimum': 0, 'type': 'number' },
      'keepAliveTimeout': { 'minimum': 0, 'type': 'number' },
      'keepAliveTimeoutThreshold': { 'minimum': 0, 'type': 'number' },
      'localAddress': { 'minLength': 1, 'type': 'string' },
      'maxConcurrentStreams': { 'minimum': 1, 'type': 'integer' },
      'maxHeaderSize': { 'minimum': 1, 'type': 'integer' },
      'maxOrigins': { 'minimum': 1, 'type': 'integer' },
      'maxRequestsPerClient': { 'minimum': 1, 'type': 'integer' },
      'maxResponseSize': { 'minimum': -1, 'type': 'integer' },
      'pipelining': { 'minimum': 0, 'type': 'integer' },
      'strictContentLength': { 'type': 'boolean' }
    },
    'required': [
      'allowH2',
      'autoSelectFamily',
      'autoSelectFamilyAttemptTimeout',
      'bodyTimeout',
      'connections',
      'connectTimeout',
      'headersTimeout',
      'keepAliveMaxTimeout',
      'keepAliveTimeout',
      'keepAliveTimeoutThreshold',
      'maxConcurrentStreams',
      'maxHeaderSize',
      'maxResponseSize',
      'pipelining',
      'strictContentLength'
    ],
    'title': 'MergedConfig',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
