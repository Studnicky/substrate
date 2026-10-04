import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

export namespace DispatchTopicMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'dispatch.completed': {
        'additionalProperties': false,
        'properties': { 'key': { 'type': 'string' }, 'result': { 'type': 'string' } },
        'required': ['key', 'result'],
        'type': 'object'
      },
      'dispatch.failed': {
        'additionalProperties': false,
        'properties': { 'error': {}, 'key': { 'type': 'string' } },
        'required': ['error', 'key'],
        'type': 'object'
      },
      'dispatch.started': {
        'additionalProperties': false,
        'properties': { 'key': { 'type': 'string' } },
        'required': ['key'],
        'type': 'object'
      }
    },
    'required': ['dispatch.completed', 'dispatch.failed', 'dispatch.started'],
    'type': 'object'
  } as const;
  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'dispatch.completed': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'key': SchemaNode.defineString({}), 'result': SchemaNode.defineString({}) },
        ['key', 'result'] as const,
        { 'additionalProperties': false, 'patternProperties': {} }
      ),
      'dispatch.failed': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'error': SchemaNode.defineUnknown({}), 'key': SchemaNode.defineString({}) },
        ['error', 'key'] as const,
        { 'additionalProperties': false, 'patternProperties': {} }
      ),
      'dispatch.started': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'key': SchemaNode.defineString({}) },
        ['key'] as const,
        { 'additionalProperties': false, 'patternProperties': {} }
      )
    },
    ['dispatch.completed', 'dispatch.failed', 'dispatch.started'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );
  export type Type = NodeStaticType<typeof Node>;
  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}
