import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Human-readable diagnostic fields exposed by Error-compatible contracts. */
export namespace ErrorDiagnosticEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorDiagnostic',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'message': { 'type': 'string' },
      'name': { 'type': 'string' },
      'stack': { 'type': 'string' }
    },
    'required': ['message', 'name'],
    'title': 'ErrorDiagnostic',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ErrorDiagnostic', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ErrorDiagnostic', 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'type': 'string' } as const), 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'stack': SchemaNode.defineString({ 'type': 'string' } as const) }, ['message', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
