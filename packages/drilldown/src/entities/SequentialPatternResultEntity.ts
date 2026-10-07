import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Detected shared-prefix/suffix numeric sequence pattern across a set of string values. */
export namespace SequentialPatternResultEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'density': { 'type': 'number' },
      'maximum': { 'type': 'integer' },
      'minimum': { 'type': 'integer' },
      'padding': { 'type': 'integer' },
      'prefix': { 'type': 'string' },
      'suffix': { 'type': 'string' }
    },
    'required': ['density', 'maximum', 'minimum', 'padding', 'prefix', 'suffix'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'density': SchemaNode.defineNumber({ 'type': 'number' } as const), 'maximum': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'minimum': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'padding': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'prefix': SchemaNode.defineString({ 'type': 'string' } as const), 'suffix': SchemaNode.defineString({ 'type': 'string' } as const) }, ['density', 'maximum', 'minimum', 'padding', 'prefix', 'suffix'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
