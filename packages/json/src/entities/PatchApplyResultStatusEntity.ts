import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Schema-derived status fields returned after applying a patch. */
export namespace PatchApplyResultStatusEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'error': { 'type': 'string' },
      'success': { 'type': 'boolean' }
    },
    'required': ['success'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'error': SchemaNode.defineString({ 'type': 'string' } as const), 'success': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['success'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
