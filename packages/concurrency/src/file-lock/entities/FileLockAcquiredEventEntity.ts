import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Fires once `#acquire` renames the target path into the lock path. */
export namespace FileLockAcquiredEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'type': { 'const': 'acquired', 'type': 'string' }
    },
    'required': ['type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'type': SchemaNode.defineConst({ 'type': 'string' } as const, 'acquired' as const) },
    ['type'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}
