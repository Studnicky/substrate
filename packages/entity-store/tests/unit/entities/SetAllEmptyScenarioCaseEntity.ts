import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { UserEntity } from './common/UserEntity.js';

/** The `set-all-empty` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace SetAllEmptyScenarioCaseEntity {
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
          'size': {
            'type': 'number'
          }
        },
        'required': ['size'],
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
        'const': 'set-all-empty'
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
      'size': SchemaNode.defineNumber({
        'type': 'number'
      } as const)
    }, ['size'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
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
    'shape': SchemaNode.defineConst({}, 'set-all-empty' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
