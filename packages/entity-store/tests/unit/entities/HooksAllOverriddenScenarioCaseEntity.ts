import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { UserEntity } from './common/UserEntity.js';

/** The `hooks-all-overridden` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace HooksAllOverriddenScenarioCaseEntity {
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
          'events': {
            'items': {
              'enum': ['remove', 'replaceAll', 'upsert']
            },
            'type': 'array'
          }
        },
        'required': ['events'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'removeOne': {
            'type': 'string'
          },
          'setAll': {
            'items': UserEntity.Schema,
            'type': 'array'
          },
          'steps': {
            'items': {
              'enum': ['removeOne', 'setAll', 'upsertMany', 'upsertOne']
            },
            'type': 'array'
          },
          'upsertMany': {
            'items': UserEntity.Schema,
            'type': 'array'
          },
          'upsertOne': UserEntity.Schema
        },
        'required': ['removeOne', 'setAll', 'steps', 'upsertMany', 'upsertOne'],
        'type': 'object'
      },
      'name': {
        'minLength': 1,
        'type': 'string'
      },
      'shape': {
        'const': 'hooks-all-overridden'
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
      'events': SchemaNode.defineArray({
        'type': 'array'
      } as const, SchemaNode.defineEnum({}, ['remove', 'replaceAll', 'upsert'] as const), undefined)
    }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({
      'type': 'object'
    } as const, {
      'removeOne': SchemaNode.defineString({
        'type': 'string'
      } as const),
      'setAll': SchemaNode.defineArray({
        'type': 'array'
      } as const, UserEntity.Node, undefined),
      'steps': SchemaNode.defineArray({
        'type': 'array'
      } as const, SchemaNode.defineEnum({}, [
        'removeOne',
        'setAll',
        'upsertMany',
        'upsertOne'
      ] as const), undefined),
      'upsertMany': SchemaNode.defineArray({
        'type': 'array'
      } as const, UserEntity.Node, undefined),
      'upsertOne': UserEntity.Node
    }, ['removeOne', 'setAll', 'steps', 'upsertMany', 'upsertOne'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({
      'minLength': 1,
      'type': 'string'
    } as const),
    'shape': SchemaNode.defineConst({}, 'hooks-all-overridden' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
