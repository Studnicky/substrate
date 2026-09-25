import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Decomposed semantic version components. */
export namespace ParsedSemverEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'major': { 'type': 'integer' },
      'minor': { 'type': 'integer' },
      'patch': { 'type': 'integer' },
      'prerelease': { 'type': 'string' }
    },
    'required': ['major', 'minor', 'patch', 'prerelease'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'major': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'minor': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'patch': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'prerelease': SchemaNode.defineString({ 'type': 'string' } as const) }, ['major', 'minor', 'patch', 'prerelease'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
