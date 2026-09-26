import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace VectorizationInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'content': { 'type': 'string' },
      'metadata': { 'additionalProperties': true, 'type': 'object' }
    },
    'required': ['content'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': SchemaNode.defineString({ 'type': 'string' } as const), 'metadata': SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': true, 'patternProperties': {} }) }, ['content'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
