import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Schema-derived wildcard metadata returned during path traversal. */
export namespace PathWildcardResultEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'isWildcard': { 'const': true },
      'remainingPath': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['isWildcard', 'remainingPath'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'isWildcard': SchemaNode.defineConst({}, true as const), 'remainingPath': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['isWildcard', 'remainingPath'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
