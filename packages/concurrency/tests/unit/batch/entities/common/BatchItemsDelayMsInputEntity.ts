import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { BatchConfigEntity } from './BatchConfigEntity.js';

/** The `{batch, items, delayMs}` input shape shared by several `batch.loop.spec.ts` timing cases. */
export namespace BatchItemsDelayMsInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'batch': BatchConfigEntity.Schema,
      'delayMs': { 'type': 'number' },
      'items': { 'items': { 'type': 'number' }, 'type': 'array' }
    },
    'required': ['batch', 'delayMs', 'items'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'batch': BatchConfigEntity.Node,
    'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)
  }, ['batch', 'delayMs', 'items'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
