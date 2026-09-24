import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace BoundedDispatcherStartEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'minProperties': 1,
    'properties': {
      'phase': { 'const': 'start', 'type': 'string' }
    },
    'required': ['phase'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'minProperties': 1, 'type': 'object' } as const, { 'phase': SchemaNode.defineConst('start' as const) }, ['phase'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
