
import type { FromSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';
import { PatchOperationEntity } from './PatchOperationEntity.js';

/** Ordered RFC-6902 operation sequence accepted by `Patch.create`. */
export namespace PatchOperationsEntity {
  export const Schema = {
    'items': PatchOperationEntity.Schema,
    'title': 'PatchOperations',
    'type': 'array'
  } as const;

  export type Type = FromSchema<
    typeof Schema,
    { 'deserialize': [{ 'output': readonly PatchOperationEntity.Type[]; 'pattern': { 'title': 'PatchOperations' } }] }
  >;

  export const validate = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
}
