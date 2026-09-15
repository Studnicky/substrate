import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/**
 * Telemetry event emitted when a request starts.
 */
export namespace RequestEventEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RequestEvent',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Telemetry event emitted when a request starts.',
    'properties': {
      'method': { 'description': 'HTTP method.', 'type': 'string' },
      'requestId': { 'description': 'Unique identifier for this request.', 'type': 'string' },
      'url': { 'description': 'Request URL.', 'type': 'string' }
    },
    'required': ['method', 'requestId', 'url'],
    'title': 'RequestEvent',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
