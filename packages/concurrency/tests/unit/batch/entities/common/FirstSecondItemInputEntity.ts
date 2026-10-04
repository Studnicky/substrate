import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { BatchConfigEntity } from './BatchConfigEntity.js';

/** The `{batch, firstItem, secondItem}` input shape for the `batchHooks.loop.spec.ts` instance-isolation case. */
export namespace FirstSecondItemInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'batch': BatchConfigEntity.Schema,
      'firstItem': { 'type': 'number' },
      'secondItem': { 'type': 'number' }
    },
    'required': ['batch', 'firstItem', 'secondItem'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'batch': BatchConfigEntity.Node,
    'firstItem': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'secondItem': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['batch', 'firstItem', 'secondItem'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
