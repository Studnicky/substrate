import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * Options for destroy operation on dispatcher or client
 */
export namespace DestroyOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/DestroyOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Options for destroy operation on dispatcher or client',
    'properties': {
      'timeout': {
        'description': 'Maximum time to wait for pending requests before forcefully aborting (ms). Absent or 0 aborts immediately.',
        'minimum': 0,
        'type': 'number'
      }
    },
    'title': 'DestroyOptions',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/DestroyOptions', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Options for destroy operation on dispatcher or client', 'title': 'DestroyOptions', 'type': 'object' } as const, { 'timeout': SchemaNode.defineNumber({
    'description': 'Maximum time to wait for pending requests before forcefully aborting (ms). Absent or 0 aborts immediately.',
    'minimum': 0,
    'type': 'number'
  } as const) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
