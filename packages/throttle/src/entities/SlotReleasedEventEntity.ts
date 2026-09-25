import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical event payload for OperationLifecycleMachine's SlotReleased transition. */
export namespace SlotReleasedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'activeCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'outcome': {
        'enum': [
          'became-idle',
          'handoff-granted',
          'still-busy'
        ],
        'type': 'string'
      },
      'totalExecuted': {
        'minimum': 0,
        'type': 'integer'
      },
      'type': {
        'const': 'SlotReleased',
        'type': 'string'
      }
    },
    'required': [
      'type',
      'activeCount',
      'outcome',
      'totalExecuted'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeCount': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'outcome': SchemaNode.defineEnum([
    'became-idle',
    'handoff-granted',
    'still-busy'
  ] as const), 'totalExecuted': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'type': SchemaNode.defineConst('SlotReleased' as const) }, [
    'type',
    'activeCount',
    'outcome',
    'totalExecuted'
  ] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
