import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';
import { ThrottleConfigEntity } from '@studnicky/throttle/entities';

/** A config bag carrying only a throttle, used by the `throttle-bound` and `undefined-result-vs-abort` scenarios. */
export namespace ThrottleOnlyConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'throttle': ThrottleConfigEntity.Schema
    },
    'required': ['throttle'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'throttle': ThrottleConfigEntity.Node
  }, ['throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
