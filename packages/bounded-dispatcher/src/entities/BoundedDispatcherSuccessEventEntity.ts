import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace BoundedDispatcherSuccessEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'minProperties': 1,
    'properties': {
      'phase': { 'const': 'success', 'type': 'string' }
    },
    'required': ['phase'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'minProperties': 1, 'type': 'object' } as const, { 'phase': SchemaNode.defineConst({}, 'success' as const) }, ['phase'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
