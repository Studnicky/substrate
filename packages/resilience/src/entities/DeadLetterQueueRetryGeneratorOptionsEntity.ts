import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace DeadLetterQueueRetryGeneratorOptionsEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'intervalMs': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['intervalMs'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$schema': 'https://json-schema.org/draft/2020-12/schema', 'type': 'object' } as const, { 'intervalMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, ['intervalMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
