import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Schema-derived serializable state carried by an internal draft node. */
export namespace DraftNodeStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'isArray': { 'type': 'boolean' }
    },
    'required': ['isArray'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'isArray': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['isArray'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
