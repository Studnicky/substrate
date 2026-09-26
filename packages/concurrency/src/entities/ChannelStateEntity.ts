import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Serializable lifecycle flags retained for one channel key. */
export namespace ChannelStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'closed': { 'type': 'boolean' },
      'subscriber': { 'type': 'boolean' }
    },
    'required': ['closed', 'subscriber'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'closed': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'subscriber': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['closed', 'subscriber'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
