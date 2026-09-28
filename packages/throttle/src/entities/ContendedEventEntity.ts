import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical event payload for OperationLifecycleMachine's Contended transition. */
export namespace ContendedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'activeCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'queuedCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'type': {
        'const': 'Contended',
        'type': 'string'
      }
    },
    'required': [
      'type',
      'activeCount',
      'queuedCount'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeCount': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'queuedCount': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'type': SchemaNode.defineConst({}, 'Contended' as const) }, [
    'type',
    'activeCount',
    'queuedCount'
  ] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
