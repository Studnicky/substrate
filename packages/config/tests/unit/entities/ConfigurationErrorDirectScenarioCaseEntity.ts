import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 3 direct-construction shapes `ConfigurationError.loop.spec.ts` exercises. */
export namespace ConfigurationErrorDirectScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'causeMessage': { 'type': 'string' },
          'message': { 'type': 'string' },
          'name': { 'type': 'string' },
          'outcome': {
            'additionalProperties': false,
            'properties': {
              'causeMessage': { 'type': 'string' }
            },
            'required': ['causeMessage'],
            'type': 'object'
          },
          'shape': { 'const': 'cause' }
        },
        'required': ['causeMessage', 'message', 'name', 'outcome', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'message': { 'type': 'string' },
          'name': { 'type': 'string' },
          'outcome': {
            'additionalProperties': false,
            'properties': {
              'code': { 'type': 'string' },
              'message': { 'type': 'string' }
            },
            'required': ['code', 'message'],
            'type': 'object'
          },
          'shape': { 'const': 'json' }
        },
        'required': ['message', 'name', 'outcome', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'message': { 'type': 'string' },
          'name': { 'type': 'string' },
          'outcome': {
            'additionalProperties': false,
            'properties': {
              'message': { 'type': 'string' }
            },
            'required': ['message'],
            'type': 'object'
          },
          'shape': { 'const': 'message' }
        },
        'required': ['message', 'name', 'outcome', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
      'message': SchemaNode.defineString({ 'type': 'string' } as const),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'outcome': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const)
      }, ['causeMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'shape': SchemaNode.defineConst({}, 'cause' as const)
    }, ['causeMessage', 'message', 'name', 'outcome', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'message': SchemaNode.defineString({ 'type': 'string' } as const),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'outcome': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'code': SchemaNode.defineString({ 'type': 'string' } as const),
        'message': SchemaNode.defineString({ 'type': 'string' } as const)
      }, ['code', 'message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'shape': SchemaNode.defineConst({}, 'json' as const)
    }, ['message', 'name', 'outcome', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'message': SchemaNode.defineString({ 'type': 'string' } as const),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'outcome': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'message': SchemaNode.defineString({ 'type': 'string' } as const)
      }, ['message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'shape': SchemaNode.defineConst({}, 'message' as const)
    }, ['message', 'name', 'outcome', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
