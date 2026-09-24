import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical event payload for OperationLifecycleMachine's AbortStarted transition. */
export namespace AbortStartedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cancelledCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'type': {
        'const': 'AbortStarted',
        'type': 'string'
      }
    },
    'required': [
      'type',
      'cancelledCount'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cancelledCount': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'type': SchemaNode.defineConst('AbortStarted' as const) }, [
    'type',
    'cancelledCount'
  ] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
