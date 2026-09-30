import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Topic map with a numeric `count` topic and a string `ping` topic. */
export namespace TestTopicsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'count': { 'type': 'number' },
      'ping': { 'type': 'string' }
    },
    'required': ['count', 'ping'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'ping': SchemaNode.defineString({ 'type': 'string' } as const)
  }, ['count', 'ping'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
