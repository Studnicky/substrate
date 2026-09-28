import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical worker envelope carrying an observational log message. */
export namespace WorkerLogEnvelopeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'message': { 'type': 'string' },
      'type': { 'enum': ['log'], 'type': 'string' }
    },
    'required': ['message', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineEnum({ 'type': 'string' } as const, ['log'] as const) }, ['message', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
