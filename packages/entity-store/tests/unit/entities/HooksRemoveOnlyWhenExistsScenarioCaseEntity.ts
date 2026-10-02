import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { HookEventEntity } from './common/HookEventEntity.js';
import { UserEntity } from './common/UserEntity.js';

/** The `hooks-remove-only-when-exists` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace HooksRemoveOnlyWhenExistsScenarioCaseEntity {
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
          'event': HookEventEntity.Schema,
          'existingRemoves': {
            'type': 'number'
          },
          'missingRemoves': {
            'type': 'number'
          }
        },
        'required': ['event', 'existingRemoves', 'missingRemoves'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'entity': UserEntity.Schema,
          'missingId': {
            'type': 'string'
          },
          'presentId': {
            'type': 'string'
          }
        },
        'required': ['entity', 'missingId', 'presentId'],
        'type': 'object'
      },
      'name': {
        'minLength': 1,
        'type': 'string'
      },
      'shape': {
        'const': 'hooks-remove-only-when-exists'
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
      'event': HookEventEntity.Node,
      'existingRemoves': SchemaNode.defineNumber({
        'type': 'number'
      } as const),
      'missingRemoves': SchemaNode.defineNumber({
        'type': 'number'
      } as const)
    }, ['event', 'existingRemoves', 'missingRemoves'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({
      'type': 'object'
    } as const, {
      'entity': UserEntity.Node,
      'missingId': SchemaNode.defineString({
        'type': 'string'
      } as const),
      'presentId': SchemaNode.defineString({
        'type': 'string'
      } as const)
    }, ['entity', 'missingId', 'presentId'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({
      'minLength': 1,
      'type': 'string'
    } as const),
    'shape': SchemaNode.defineConst({}, 'hooks-remove-only-when-exists' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
