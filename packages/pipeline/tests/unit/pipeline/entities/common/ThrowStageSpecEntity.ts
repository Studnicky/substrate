import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** One branch of the discriminated-union subclass stage spec, keyed by `shape: 'throw'`. */
export namespace ThrowStageSpecEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'message': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'throw' } },
    'required': ['message', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'throw' as const) }, ['message', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
