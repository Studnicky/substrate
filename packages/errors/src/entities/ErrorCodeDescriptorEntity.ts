import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Describes a registered error code entry in `ErrorCodeRegistry`. */
export namespace ErrorCodeDescriptorEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorCodeDescriptor',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'code': {
        'description': "Dotted camelCase error code (e.g. 'errors.validationFailed').",
        'type': 'string'
      },
      'description': {
        'description': 'Human-readable description of what this code represents.',
        'type': 'string'
      },
      'retryable': {
        'description': 'Whether errors with this code should be retried.',
        'type': 'boolean'
      }
    },
    'required': ['code', 'description', 'retryable'],
    'title': 'ErrorCodeDescriptor',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ErrorCodeDescriptor', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ErrorCodeDescriptor', 'type': 'object' } as const, { 'code': SchemaNode.defineString({
    'description': "Dotted camelCase error code (e.g. 'errors.validationFailed').",
    'type': 'string'
  } as const), 'description': SchemaNode.defineString({
    'description': 'Human-readable description of what this code represents.',
    'type': 'string'
  } as const), 'retryable': SchemaNode.defineBoolean({
    'description': 'Whether errors with this code should be retried.',
    'type': 'boolean'
  } as const) }, ['code', 'description', 'retryable'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
