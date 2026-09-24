import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Options for path traversal. */
export namespace PathGetOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximumDepth': { 'minimum': 0, 'type': 'integer' }
    },
    'title': 'PathGetOptionsType',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'title': 'PathGetOptionsType', 'type': 'object' } as const, { 'maximumDepth': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
