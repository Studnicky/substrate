import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace RerankInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'candidateIds': { 'items': { 'type': 'string' }, 'type': 'array' },
      'content': { 'type': 'string' }
    },
    'required': ['candidateIds', 'content'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'candidateIds': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), 'content': SchemaNode.defineString({ 'type': 'string' } as const) }, ['candidateIds', 'content'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
