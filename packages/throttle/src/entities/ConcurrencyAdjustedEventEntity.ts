import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical event payload for OperationLifecycleMachine's ConcurrencyAdjusted transition. */
export namespace ConcurrencyAdjustedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'newLimit': {
        'minimum': 0,
        'type': 'integer'
      },
      'previousLimit': {
        'minimum': 0,
        'type': 'integer'
      },
      'type': {
        'const': 'ConcurrencyAdjusted',
        'type': 'string'
      }
    },
    'required': [
      'type',
      'newLimit',
      'previousLimit'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'newLimit': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'previousLimit': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'type': SchemaNode.defineConst({}, 'ConcurrencyAdjusted' as const) }, [
    'type',
    'newLimit',
    'previousLimit'
  ] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
