import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

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

  export type Type = FromSchema<
    typeof Schema,
    { 'deserialize': [{ 'output': readonly PatchOperationEntity.Type[]; 'pattern': { 'title': 'PatchOperations' } }] }
  >;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
