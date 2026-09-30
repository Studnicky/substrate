import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { BatchConfigEntity } from './BatchConfigEntity.js';

/** The input shape for the `batchHooks.loop.spec.ts` continue-on-hook-error case. */
export namespace ContinueOnHookErrorInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'batch': BatchConfigEntity.Schema,
      'errorHookErrorIndex': { 'type': 'number' },
      'errorItem': { 'type': 'number' },
      'items': { 'items': { 'type': 'number' }, 'type': 'array' },
      'operationErrorMessage': { 'minLength': 1, 'type': 'string' },
      'successHookErrorIndex': { 'type': 'number' }
    },
    'required': ['batch', 'errorHookErrorIndex', 'errorItem', 'items', 'operationErrorMessage', 'successHookErrorIndex'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'batch': BatchConfigEntity.Node,
    'errorHookErrorIndex': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'errorItem': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
    'operationErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'successHookErrorIndex': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['batch', 'errorHookErrorIndex', 'errorItem', 'items', 'operationErrorMessage', 'successHookErrorIndex'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
