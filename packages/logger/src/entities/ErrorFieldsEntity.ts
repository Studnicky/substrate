import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * Error fields for failed operations.
 * Include when status is a failure state.
 */
export namespace ErrorFieldsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorFields',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Error fields for failed operations.',
    'properties': {
      'cause': {
        'description': 'Underlying cause message (for chained errors).',
        'type': 'string'
      },
      'error': {
        'description': 'Human-readable error message.',
        'type': 'string'
      },
      'errorCode': {
        'description': 'Machine-readable error code.',
        'type': 'string'
      }
    },
    'required': ['error'],
    'title': 'ErrorFields',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ErrorFields', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Error fields for failed operations.', 'title': 'ErrorFields', 'type': 'object' } as const, { 'cause': SchemaNode.defineString({
    'description': 'Underlying cause message (for chained errors).',
    'type': 'string'
  } as const), 'error': SchemaNode.defineString({
    'description': 'Human-readable error message.',
    'type': 'string'
  } as const), 'errorCode': SchemaNode.defineString({
    'description': 'Machine-readable error code.',
    'type': 'string'
  } as const) }, ['error'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
