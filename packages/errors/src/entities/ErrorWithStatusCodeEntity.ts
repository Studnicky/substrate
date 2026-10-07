import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Error with HTTP status code (alternative property name). */
export namespace ErrorWithStatusCodeEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithStatusCode',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': true,
    'properties': {
      'statusCode': { 'type': 'number' }
    },
    'required': ['statusCode'],
    'title': 'ErrorWithStatusCode',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithStatusCode', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ErrorWithStatusCode', 'type': 'object' } as const, { 'statusCode': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['statusCode'] as const, { 'additionalProperties': true, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
