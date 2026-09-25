import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Schema-validatable snapshot emitted when a retry attempt begins. */
export namespace RetryAttemptEventEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RetryAttemptEvent',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'attemptNumber': { 'minimum': 0, 'type': 'integer' },
      'elapsedMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['attemptNumber', 'elapsedMs'],
    'title': 'RetryAttemptEvent',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/RetryAttemptEvent', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'RetryAttemptEvent', 'type': 'object' } as const, { 'attemptNumber': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'elapsedMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, ['attemptNumber', 'elapsedMs'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
