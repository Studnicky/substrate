import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { ContinueOnHookErrorInputEntity } from './common/ContinueOnHookErrorInputEntity.js';

/** The `continue-on-hook-error` scenario case shape `batchHooks.loop.spec.ts` exercises. */
export namespace ContinueOnHookErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'hookErrorCount': { 'type': 'number' },
          'statuses': { 'items': { 'enum': ['fulfilled', 'rejected'] }, 'type': 'array' }
        },
        'required': ['hookErrorCount', 'statuses'],
        'type': 'object'
      },
      'input': ContinueOnHookErrorInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'continue-on-hook-error' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'statuses': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineEnum({}, ['fulfilled', 'rejected'] as const), undefined)
    }, ['hookErrorCount', 'statuses'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': ContinueOnHookErrorInputEntity.Node,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'continue-on-hook-error' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
