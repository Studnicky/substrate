import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical event payload for OperationLifecycleMachine's Queued transition. */
export namespace QueuedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'queuedCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'type': {
        'const': 'Queued',
        'type': 'string'
      }
    },
    'required': [
      'type',
      'queuedCount'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'queuedCount': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'type': SchemaNode.defineConst({}, 'Queued' as const) }, [
    'type',
    'queuedCount'
  ] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
