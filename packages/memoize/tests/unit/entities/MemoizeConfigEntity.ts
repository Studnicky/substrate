import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** The memoize cache configuration a scenario supplies: capacity plus optional stale and ttl windows. */
export namespace MemoizeConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'capacity': { 'type': 'number' },
      'keyDeriverShape': { 'type': 'string' },
      'staleMs': { 'type': 'number' },
      'ttlMs': { 'type': 'number' }
    },
    'required': ['capacity'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'capacity': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'keyDeriverShape': SchemaNode.defineString({ 'type': 'string' } as const),
    'staleMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'ttlMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['capacity'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
