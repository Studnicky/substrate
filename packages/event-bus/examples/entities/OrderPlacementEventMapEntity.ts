import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

export namespace OrderPlacementEventMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'order:placed': {
        'additionalProperties': false,
        'properties': {
          'orderId': { 'type': 'string' }
        },
        'required': ['orderId'],
        'type': 'object'
      }
    },
    'required': ['order:placed'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'order:placed': SchemaNode.defineObject({ 'type': 'object' } as const, { 'orderId': SchemaNode.defineString({ 'type': 'string' } as const) }, ['orderId'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['order:placed'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
