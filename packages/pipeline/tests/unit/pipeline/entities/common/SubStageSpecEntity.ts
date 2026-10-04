import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** One branch of the discriminated-union subclass stage spec, keyed by `shape: 'sub'`. */
export namespace SubStageSpecEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'shape': { 'const': 'sub' }, 'value': { 'type': 'number' } },
    'required': ['shape', 'value'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'sub' as const), 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['shape', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
