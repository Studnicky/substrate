import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Error with address information. */
export namespace ErrorWithAddressEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithAddress',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': true,
    'properties': {
      'address': { 'type': 'string' }
    },
    'required': ['address'],
    'title': 'ErrorWithAddress',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithAddress', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ErrorWithAddress', 'type': 'object' } as const, { 'address': SchemaNode.defineString({ 'type': 'string' } as const) }, ['address'] as const, { 'additionalProperties': true });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
