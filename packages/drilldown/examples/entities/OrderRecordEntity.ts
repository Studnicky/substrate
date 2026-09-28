import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

export namespace OrderRecordEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'category': { 'type': 'string' },
      'region': { 'type': 'string' },
      'status': { 'type': 'string' }
    },
    'required': ['category', 'region', 'status'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'category': SchemaNode.defineString({ 'type': 'string' } as const), 'region': SchemaNode.defineString({ 'type': 'string' } as const), 'status': SchemaNode.defineString({ 'type': 'string' } as const) }, ['category', 'region', 'status'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
