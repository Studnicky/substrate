import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';
import { TokenCountEntity } from '@studnicky/resilience/entities';

/** Canonical key and token count accepted by rate-limit operations. `tokens` composes `TokenCountEntity` — resilience owns that constraint, since it also backs `TokenBucket`. */
export namespace RateLimitRequestEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'key': { 'minLength': 1, 'type': 'string' },
      'tokens': TokenCountEntity.Schema
    },
    'required': ['key'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'tokens': TokenCountEntity.Node }, ['key'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
