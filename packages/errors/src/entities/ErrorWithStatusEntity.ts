import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Error with HTTP status code. */
export namespace ErrorWithStatusEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithStatus',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': true,
    'properties': {
      'status': { 'type': 'number' }
    },
    'required': ['status'],
    'title': 'ErrorWithStatus',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithStatus', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ErrorWithStatus', 'type': 'object' } as const, { 'status': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['status'] as const, { 'additionalProperties': true, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
