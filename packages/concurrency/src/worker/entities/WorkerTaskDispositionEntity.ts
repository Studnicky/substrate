import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical retry and settlement flags retained for an assigned worker task. */
export namespace WorkerTaskDispositionEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'retried': { 'type': 'boolean' },
      'settled': { 'type': 'boolean' }
    },
    'required': ['retried', 'settled'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'retried': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'settled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['retried', 'settled'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
