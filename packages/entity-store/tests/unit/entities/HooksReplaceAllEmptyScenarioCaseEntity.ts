import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { HookEventEntity } from './common/HookEventEntity.js';
import { UserEntity } from './common/UserEntity.js';

/** The `hooks-replace-all-empty` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace HooksReplaceAllEmptyScenarioCaseEntity {
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
          'replaceEvents': {
            'items': HookEventEntity.Schema,
            'type': 'array'
          }
        },
        'required': ['replaceEvents'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'initial': {
            'items': UserEntity.Schema,
            'type': 'array'
          },
          'next': {
            'items': UserEntity.Schema,
            'type': 'array'
          }
        },
        'required': ['initial', 'next'],
        'type': 'object'
      },
      'name': {
        'minLength': 1,
        'type': 'string'
      },
      'shape': {
        'const': 'hooks-replace-all-empty'
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
      'replaceEvents': SchemaNode.defineArray({
        'type': 'array'
      } as const, HookEventEntity.Node, undefined)
    }, ['replaceEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({
      'type': 'object'
    } as const, {
      'initial': SchemaNode.defineArray({
        'type': 'array'
      } as const, UserEntity.Node, undefined),
      'next': SchemaNode.defineArray({
        'type': 'array'
      } as const, UserEntity.Node, undefined)
    }, ['initial', 'next'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({
      'minLength': 1,
      'type': 'string'
    } as const),
    'shape': SchemaNode.defineConst({}, 'hooks-replace-all-empty' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
