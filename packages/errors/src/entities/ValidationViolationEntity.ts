import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Describes one validation failure from a schema check. */
export namespace ValidationViolationEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationViolation',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'keyword': {
        'description': "Validation keyword that triggered the failure (e.g. 'required', 'minLength').",
        'type': 'string'
      },
      'message': {
        'description': 'Human-readable description of the failure.',
        'type': 'string'
      },
      'path': {
        'description': "JSON Pointer or field name of the failing field (e.g. '/user/email').",
        'type': 'string'
      }
    },
    'required': ['keyword', 'message', 'path'],
    'title': 'ValidationViolation',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ValidationViolation', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ValidationViolation', 'type': 'object' } as const, { 'keyword': SchemaNode.defineString({
    'description': "Validation keyword that triggered the failure (e.g. 'required', 'minLength').",
    'type': 'string'
  } as const), 'message': SchemaNode.defineString({
    'description': 'Human-readable description of the failure.',
    'type': 'string'
  } as const), 'path': SchemaNode.defineString({
    'description': "JSON Pointer or field name of the failing field (e.g. '/user/email').",
    'type': 'string'
  } as const) }, ['keyword', 'message', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
