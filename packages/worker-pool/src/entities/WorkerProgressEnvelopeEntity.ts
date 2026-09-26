import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical worker envelope reporting task progress. */
export namespace WorkerProgressEnvelopeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'percent': { 'maximum': 100, 'minimum': 0, 'type': 'number' },
      'type': { 'enum': ['progress'], 'type': 'string' }
    },
    'required': ['percent', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'percent': SchemaNode.defineNumber({ 'maximum': 100, 'minimum': 0, 'type': 'number' } as const), 'type': SchemaNode.defineEnum({ 'type': 'string' } as const, ['progress'] as const) }, ['percent', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
