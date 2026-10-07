import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Error with system errno. */
export namespace ErrorWithErrnoEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithErrno',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': true,
    'properties': {
      'errno': { 'type': 'number' }
    },
    'required': ['errno'],
    'title': 'ErrorWithErrno',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithErrno', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ErrorWithErrno', 'type': 'object' } as const, { 'errno': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['errno'] as const, { 'additionalProperties': true, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
