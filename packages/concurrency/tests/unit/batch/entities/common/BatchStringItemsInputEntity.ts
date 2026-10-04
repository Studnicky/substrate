import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { BatchConfigEntity } from './BatchConfigEntity.js';

/** The `{batch, items: string[]}` input shape for the `batchHooks.loop.spec.ts` global-indices case. */
export namespace BatchStringItemsInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'batch': BatchConfigEntity.Schema, 'items': { 'items': { 'type': 'string' }, 'type': 'array' } },
    'required': ['batch', 'items'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'batch': BatchConfigEntity.Node,
    'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
  }, ['batch', 'items'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
