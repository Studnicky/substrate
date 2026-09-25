import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Schema-validatable configuration shared by runtime backoff contracts. */
export namespace BackoffConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/BackoffConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'baseDelayMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['baseDelayMs'],
    'title': 'BackoffConfig',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/BackoffConfig', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'BackoffConfig', 'type': 'object' } as const, { 'baseDelayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, ['baseDelayMs'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
