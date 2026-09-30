import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** A `class.method` pair whose body may throw a value that is not a BaseError: the sanctioned channel for errors raised by caller-supplied code. */
export namespace PassThroughMethodEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'class': {
        'description': 'Name of the class declaring the pass-through method.',
        'type': 'string'
      },
      'method': {
        'description': 'Name of the method whose body may throw a value that is not a BaseError.',
        'type': 'string'
      }
    },
    'required': ['class', 'method'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'class': SchemaNode.defineString({
      'description': 'Name of the class declaring the pass-through method.',
      'type': 'string'
    } as const),
    'method': SchemaNode.defineString({
      'description': 'Name of the method whose body may throw a value that is not a BaseError.',
      'type': 'string'
    } as const)
  }, ['class', 'method'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
