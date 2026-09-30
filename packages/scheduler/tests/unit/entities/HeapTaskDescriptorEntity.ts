import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** A heap task fixture: its scheduling fields plus an optional mutation applied after it enters the heap. */
export namespace HeapTaskDescriptorEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'atMs': { 'type': 'number' },
      'fire': { 'const': 'noop' },
      'id': { 'type': 'string' },
      'intervalMs': { 'type': 'number' },
      'mutation': {
        'additionalProperties': false,
        'properties': { 'atMs': { 'type': 'number' }, 'id': { 'type': 'string' } },
        'type': 'object'
      },
      'variant': { 'enum': ['interval', 'timeout'] }
    },
    'required': ['atMs', 'fire', 'id', 'intervalMs', 'variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'fire': SchemaNode.defineConst({}, 'noop' as const),
    'id': SchemaNode.defineString({ 'type': 'string' } as const),
    'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'mutation': SchemaNode.defineObject({ 'type': 'object' } as const, { 'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'id': SchemaNode.defineString({ 'type': 'string' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'variant': SchemaNode.defineEnum({}, ['interval', 'timeout'] as const)
  }, ['atMs', 'fire', 'id', 'intervalMs', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
