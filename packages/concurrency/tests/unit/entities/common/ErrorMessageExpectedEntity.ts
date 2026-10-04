import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{errorMessage}` expected shape for the `AsyncIter.loop.spec.ts` error-propagation case. */
export namespace ErrorMessageExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'errorMessage': { 'minLength': 1, 'type': 'string' } },
    'required': ['errorMessage'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['errorMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
