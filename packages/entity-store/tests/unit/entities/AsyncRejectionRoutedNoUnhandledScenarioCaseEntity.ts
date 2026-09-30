import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { HookFailureEntity } from './common/HookFailureEntity.js';
import { UserEntity } from './common/UserEntity.js';

/** The `async-rejection-routed-no-unhandled` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace AsyncRejectionRoutedNoUnhandledScenarioCaseEntity {
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
          'hookName': {
            'type': 'string'
          },
          'size': {
            'type': 'number'
          },
          'unhandledRejections': {
            'type': 'number'
          }
        },
        'required': [
          'entity',
          'hookErrorCount',
          'hookName',
          'size',
          'unhandledRejections'
        ],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'entity': UserEntity.Schema,
          'failure': HookFailureEntity.Schema
        },
        'required': ['entity', 'failure'],
        'type': 'object'
      },
      'name': {
        'minLength': 1,
        'type': 'string'
      },
      'shape': {
        'const': 'async-rejection-routed-no-unhandled'
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
      'hookName': SchemaNode.defineString({
        'type': 'string'
      } as const),
      'size': SchemaNode.defineNumber({
        'type': 'number'
      } as const),
      'unhandledRejections': SchemaNode.defineNumber({
        'type': 'number'
      } as const)
    }, [
      'entity',
      'hookErrorCount',
      'hookName',
      'size',
      'unhandledRejections'
    ] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({
      'type': 'object'
    } as const, {
      'entity': UserEntity.Node,
      'failure': HookFailureEntity.Node
    }, ['entity', 'failure'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({
      'minLength': 1,
      'type': 'string'
    } as const),
    'shape': SchemaNode.defineConst({}, 'async-rejection-routed-no-unhandled' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
