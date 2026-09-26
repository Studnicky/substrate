import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace ClampEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'clamped': { 'type': 'number' },
      'field': { 'type': 'string' },
      'raw': { 'type': 'number' },
      'reason': { 'type': 'string' }
    },
    'required': ['clamped', 'field', 'raw', 'reason'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'clamped': SchemaNode.defineNumber({ 'type': 'number' } as const), 'field': SchemaNode.defineString({ 'type': 'string' } as const), 'raw': SchemaNode.defineNumber({ 'type': 'number' } as const), 'reason': SchemaNode.defineString({ 'type': 'string' } as const) }, ['clamped', 'field', 'raw', 'reason'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
