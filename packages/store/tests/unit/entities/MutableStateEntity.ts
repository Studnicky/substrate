import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** A nested mutable state value used to prove stores own their state across persistence and snapshots. */
export namespace MutableStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'nested': { 'additionalProperties': false, 'properties': { 'count': { 'type': 'number' } }, 'required': ['count'], 'type': 'object' },
      'values': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['nested', 'values'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'nested': SchemaNode.defineObject({ 'type': 'object' } as const, { 'count': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['count'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
  }, ['nested', 'values'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
