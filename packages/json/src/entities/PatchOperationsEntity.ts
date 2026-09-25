import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { JsonValueSchema } from '../schema/JsonValueSchema.js';
import { PatchOperationEntity } from './PatchOperationEntity.js';

/** Ordered RFC-6902 operation sequence accepted by `Patch.create`. */
export namespace PatchOperationsEntity {
  export const Schema = {
    ...JsonValueSchema,
    'items': PatchOperationEntity.Schema,
    'title': 'PatchOperations',
    'type': 'array'
  } as const;

  export const Node = SchemaNode.defineArray({ 'type': 'array' } as const, PatchOperationEntity.Node);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
