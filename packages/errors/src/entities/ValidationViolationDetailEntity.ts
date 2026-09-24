import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Describes one validation failure from a schema check, with optional structured details. */
export namespace ValidationViolationDetailEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationViolationDetail',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'details': {
        'description': 'Additional structured details about the violation.',
        'type': 'object'
      },
      'message': {
        'description': 'Human-readable description of the failure.',
        'type': 'string'
      },
      'path': {
        'description': "JSON Pointer or dot-path to the failing field (e.g. '/user/email').",
        'type': 'string'
      }
    },
    'required': ['message', 'path'],
    'title': 'ValidationViolationDetail',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ValidationViolationDetail', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ValidationViolationDetail', 'type': 'object' } as const, { 'details': SchemaNode.defineObject({ 'description': 'Additional structured details about the violation.', 'type': 'object' } as const, {  }, [] as const), 'message': SchemaNode.defineString({
    'description': 'Human-readable description of the failure.',
    'type': 'string'
  } as const), 'path': SchemaNode.defineString({
    'description': "JSON Pointer or dot-path to the failing field (e.g. '/user/email').",
    'type': 'string'
  } as const) }, ['message', 'path'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
