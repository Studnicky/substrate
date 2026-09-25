import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

export namespace OrderLifecycleEventMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'order:placed': {
        'additionalProperties': false,
        'properties': {
          'id': { 'type': 'string' },
          'total': { 'type': 'number' }
        },
        'required': ['id', 'total'],
        'type': 'object'
      },
      'order:shipped': {
        'additionalProperties': false,
        'properties': {
          'carrier': { 'type': 'string' },
          'id': { 'type': 'string' }
        },
        'required': ['carrier', 'id'],
        'type': 'object'
      }
    },
    'required': ['order:placed', 'order:shipped'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'order:placed': SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': SchemaNode.defineString({ 'type': 'string' } as const), 'total': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['id', 'total'] as const, { 'additionalProperties': false }), 'order:shipped': SchemaNode.defineObject({ 'type': 'object' } as const, { 'carrier': SchemaNode.defineString({ 'type': 'string' } as const), 'id': SchemaNode.defineString({ 'type': 'string' } as const) }, ['carrier', 'id'] as const, { 'additionalProperties': false }) }, ['order:placed', 'order:shipped'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
