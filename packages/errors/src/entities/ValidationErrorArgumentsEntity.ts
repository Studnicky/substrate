import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { ValidationViolationDetailEntity } from './ValidationViolationDetailEntity.js';

/** Construction arguments for `ValidationError`. */
export namespace ValidationErrorArgumentsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationErrorArguments',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'correlationId': {
        'description': 'Optional correlation ID for distributed tracing.',
        'type': 'string'
      },
      'message': {
        'description': 'Human-readable summary of the validation failure.',
        'type': 'string'
      },
      'path': {
        'description': 'JSON Pointer or field name identifying the invalid value.',
        'type': 'string'
      },
      'violations': {
        'description': 'Structured validation violations.',
        'items': ValidationViolationDetailEntity.Schema,
        'type': 'array'
      }
    },
    'required': ['message', 'path'],
    'title': 'ValidationErrorArguments',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ValidationErrorArguments', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ValidationErrorArguments', 'type': 'object' } as const, { 'correlationId': SchemaNode.defineString({
    'description': 'Optional correlation ID for distributed tracing.',
    'type': 'string'
  } as const), 'message': SchemaNode.defineString({
    'description': 'Human-readable summary of the validation failure.',
    'type': 'string'
  } as const), 'path': SchemaNode.defineString({
    'description': 'JSON Pointer or field name identifying the invalid value.',
    'type': 'string'
  } as const), 'violations': SchemaNode.defineArray({ 'description': 'Structured validation violations.', 'type': 'array' } as const, ValidationViolationDetailEntity.Node, undefined) }, ['message', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
