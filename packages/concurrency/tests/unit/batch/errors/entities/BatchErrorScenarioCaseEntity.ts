import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `batch-error.loop.spec.ts` exercises. */
export namespace BatchErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'code': { 'minLength': 1, 'type': 'string' },
          'correlationId': { 'type': 'string' },
          'message': { 'minLength': 1, 'type': 'string' },
          'metadata': {
            'additionalProperties': false,
            'properties': { 'field': { 'minLength': 1, 'type': 'string' }, 'value': { 'type': 'number' } },
            'required': ['field', 'value'],
            'type': 'object'
          },
          'retryable': { 'type': 'boolean' }
        },
        'required': ['code', 'message', 'retryable'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'error': {
            'additionalProperties': false,
            'properties': {
              'errorOptions': {
                'additionalProperties': false,
                'properties': {
                  'cause': {},
                  'correlationId': { 'type': 'string' },
                  'metadata': {
                    'additionalProperties': false,
                    'properties': { 'field': { 'minLength': 1, 'type': 'string' }, 'value': { 'type': 'number' } },
                    'required': ['field', 'value'],
                    'type': 'object'
                  },
                  'retryable': { 'type': 'boolean' }
                },
                'required': [],
                'type': 'object'
              },
              'message': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['message'],
            'type': 'object'
          }
        },
        'required': ['error'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'construction' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'correlationId': SchemaNode.defineString({ 'type': 'string' } as const),
      'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'metadata': SchemaNode.defineObject({ 'type': 'object' } as const, { 'field': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['field', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    }, ['code', 'message', 'retryable'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'error': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'errorOptions': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'cause': SchemaNode.defineUnknown({} as const),
          'correlationId': SchemaNode.defineString({ 'type': 'string' } as const),
          'metadata': SchemaNode.defineObject({ 'type': 'object' } as const, { 'field': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['field', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
      }, ['message'] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['error'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'construction' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
