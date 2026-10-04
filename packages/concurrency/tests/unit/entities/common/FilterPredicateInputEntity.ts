import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{predicate?, values}` input shape shared by `AsyncIter.loop.spec.ts` sync filter cases. `predicate` is absent on the pass-through-all fixture. */
export namespace FilterPredicateInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'predicate': { 'enum': ['even', 'all'] },
      'values': { 'items': { 'type': 'number' }, 'type': 'array' }
    },
    'required': ['values'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'predicate': SchemaNode.defineEnum({}, ['even', 'all'] as const),
    'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)
  }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
