import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { HookFailureEntity } from './common/HookFailureEntity.js';
import { UserEntity } from './common/UserEntity.js';

/** The `throwing-on-replace-all-preserves-swap` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace ThrowingOnReplaceAllPreservesSwapScenarioCaseEntity {
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
          'entity': UserEntity.Schema,
          'hookErrorCount': {
            'type': 'number'
          },
          'size': {
            'type': 'number'
          }
        },
        'required': ['entity', 'hookErrorCount', 'size'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'failure': HookFailureEntity.Schema,
          'initial': UserEntity.Schema,
          'next': UserEntity.Schema
        },
        'required': ['failure', 'initial', 'next'],
        'type': 'object'
      },
      'name': {
        'minLength': 1,
        'type': 'string'
      },
      'shape': {
        'const': 'throwing-on-replace-all-preserves-swap'
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
      'entity': UserEntity.Node,
      'hookErrorCount': SchemaNode.defineNumber({
        'type': 'number'
      } as const),
      'size': SchemaNode.defineNumber({
        'type': 'number'
      } as const)
    }, ['entity', 'hookErrorCount', 'size'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({
      'type': 'object'
    } as const, {
      'failure': HookFailureEntity.Node,
      'initial': UserEntity.Node,
      'next': UserEntity.Node
    }, ['failure', 'initial', 'next'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({
      'minLength': 1,
      'type': 'string'
    } as const),
    'shape': SchemaNode.defineConst({}, 'throwing-on-replace-all-preserves-swap' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
