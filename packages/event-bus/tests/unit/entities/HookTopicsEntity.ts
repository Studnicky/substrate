import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Topic map whose `order:created` and `order:updated` topics carry an order id payload. */
export namespace HookTopicsEntity {
  const OrderSchema = {
    'additionalProperties': false,
    'properties': { 'id': { 'type': 'string' } },
    'required': ['id'],
    'type': 'object'
  } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'order:created': OrderSchema,
      'order:updated': OrderSchema
    },
    'required': ['order:created', 'order:updated'],
    'type': 'object'
  } as const;

  const OrderNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'id': SchemaNode.defineString({ 'type': 'string' } as const)
  }, ['id'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'order:created': OrderNode,
    'order:updated': OrderNode
  }, ['order:created', 'order:updated'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
