import type {
  EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Validated options for acquiring a browser Web Lock. */
export namespace WebLockOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'name': {
        'minLength': 1, 'type': 'string'
      }
    },
    'required': ['name'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineString({
    'minLength': 1, 'type': 'string'
  } as const) }, ['name'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
