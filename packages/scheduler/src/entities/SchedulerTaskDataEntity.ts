import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace SchedulerTaskDataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'atMs': { 'type': 'number' },
      'intervalMs': { 'minimum': 0, 'type': 'number' },
      'variant': { 'enum': ['interval', 'timeout'], 'type': 'string' }
    },
    'required': ['atMs', 'intervalMs', 'variant'],
    'type': 'object'
  } as const;

  /** Serializable scheduling data retained for a pending task. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'intervalMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'variant': SchemaNode.defineEnum({}, ['interval', 'timeout'] as const) }, ['atMs', 'intervalMs', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
