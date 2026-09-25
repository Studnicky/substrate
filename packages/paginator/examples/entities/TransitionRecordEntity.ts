import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

export namespace TransitionRecordEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'event': { 'type': 'string' },
      'from': { 'type': 'string' },
      'to': { 'type': 'string' }
    },
    'required': ['event', 'from', 'to'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': SchemaNode.defineString({ 'type': 'string' } as const), 'from': SchemaNode.defineString({ 'type': 'string' } as const), 'to': SchemaNode.defineString({ 'type': 'string' } as const) }, ['event', 'from', 'to'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
