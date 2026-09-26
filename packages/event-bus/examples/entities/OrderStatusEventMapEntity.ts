import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

export namespace OrderStatusEventMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'order:created': {
        'additionalProperties': false,
        'properties': {
          'id': { 'type': 'string' },
          'total': { 'type': 'number' }
        },
        'required': ['id', 'total'],
        'type': 'object'
      },
      'order:updated': {
        'additionalProperties': false,
        'properties': {
          'id': { 'type': 'string' },
          'status': { 'type': 'string' }
        },
        'required': ['id', 'status'],
        'type': 'object'
      }
    },
    'required': ['order:created', 'order:updated'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'order:created': SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': SchemaNode.defineString({ 'type': 'string' } as const), 'total': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['id', 'total'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'order:updated': SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': SchemaNode.defineString({ 'type': 'string' } as const), 'status': SchemaNode.defineString({ 'type': 'string' } as const) }, ['id', 'status'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['order:created', 'order:updated'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
