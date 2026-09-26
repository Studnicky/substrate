import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

export namespace JobEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'message': { 'type': 'string' },
      'variant': { 'const': 'log', 'type': 'string' }
    },
    'required': ['message', 'variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'type': 'string' } as const), 'variant': SchemaNode.defineConst({ 'type': 'string' } as const, 'log' as const) }, ['message', 'variant'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
