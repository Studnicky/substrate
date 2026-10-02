import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { UserEntity } from './common/UserEntity.js';

/** The `hooks-upsert-many` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace HooksUpsertManyScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': {
        'minLength': 1,
        'type': 'string'
      },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'ids': {
            'items': {
              'type': 'string'
            },
            'type': 'array'
          },
          'upsertCount': {
            'type': 'number'
          }
        },
        'required': ['ids', 'upsertCount'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'entities': {
            'items': UserEntity.Schema,
            'type': 'array'
          }
        },
        'required': ['entities'],
        'type': 'object'
      },
      'name': {
        'minLength': 1,
        'type': 'string'
      },
      'shape': {
        'const': 'hooks-upsert-many'
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({
      'minLength': 1,
      'type': 'string'
    } as const),
    'expected': SchemaNode.defineObject({
      'type': 'object'
    } as const, {
      'ids': SchemaNode.defineArray({
        'type': 'array'
      } as const, SchemaNode.defineString({
        'type': 'string'
      } as const), undefined),
      'upsertCount': SchemaNode.defineNumber({
        'type': 'number'
      } as const)
    }, ['ids', 'upsertCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({
      'type': 'object'
    } as const, {
      'entities': SchemaNode.defineArray({
        'type': 'array'
      } as const, UserEntity.Node, undefined)
    }, ['entities'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({
      'minLength': 1,
      'type': 'string'
    } as const),
    'shape': SchemaNode.defineConst({}, 'hooks-upsert-many' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
