import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{errorName}` expected shape shared by the `Semaphore.loop.spec.ts` rejected-construction cases. */
export namespace ErrorNameExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'errorName': { 'minLength': 1, 'type': 'string' } },
    'required': ['errorName'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
