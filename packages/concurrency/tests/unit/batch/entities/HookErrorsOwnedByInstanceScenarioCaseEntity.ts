import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { FirstSecondItemInputEntity } from './common/FirstSecondItemInputEntity.js';

/** The `hook-errors-owned-by-instance` scenario case shape `batchHooks.loop.spec.ts` exercises. */
export namespace HookErrorsOwnedByInstanceScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'firstCauseMessage': { 'minLength': 1, 'type': 'string' },
          'firstHookErrorCount': { 'type': 'number' },
          'secondCauseMessage': { 'minLength': 1, 'type': 'string' },
          'secondHookErrorCount': { 'type': 'number' }
        },
        'required': ['firstCauseMessage', 'firstHookErrorCount', 'secondCauseMessage', 'secondHookErrorCount'],
        'type': 'object'
      },
      'input': FirstSecondItemInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'hook-errors-owned-by-instance' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'firstCauseMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'firstHookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'secondCauseMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'secondHookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['firstCauseMessage', 'firstHookErrorCount', 'secondCauseMessage', 'secondHookErrorCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': FirstSecondItemInputEntity.Node,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'hook-errors-owned-by-instance' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
