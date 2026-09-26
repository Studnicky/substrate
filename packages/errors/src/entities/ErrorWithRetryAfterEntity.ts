import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Error with retry-after value (typically in seconds). */
export namespace ErrorWithRetryAfterEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithRetryAfter',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': true,
    'properties': {
      'retryAfter': { 'type': 'number' }
    },
    'required': ['retryAfter'],
    'title': 'ErrorWithRetryAfter',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithRetryAfter', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ErrorWithRetryAfter', 'type': 'object' } as const, { 'retryAfter': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['retryAfter'] as const, { 'additionalProperties': true, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
