import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { BatchItemsErrorInputEntity } from './common/BatchItemsErrorInputEntity.js';

/** The `on-item-error` scenario case shape `batchHooks.loop.spec.ts` exercises. */
export namespace OnItemErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'firstErrorIndex': { 'type': 'number' },
          'itemErrorCount': { 'type': 'number' },
          'rejectedMessage': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['firstErrorIndex', 'itemErrorCount', 'rejectedMessage'],
        'type': 'object'
      },
      'input': BatchItemsErrorInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'on-item-error' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'firstErrorIndex': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'itemErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'rejectedMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['firstErrorIndex', 'itemErrorCount', 'rejectedMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': BatchItemsErrorInputEntity.Node,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'on-item-error' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
