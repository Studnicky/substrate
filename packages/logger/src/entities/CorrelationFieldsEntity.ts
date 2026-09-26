import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * Correlation fields for tracing operations across the stack.
 * Set once at request entry, inherited via child loggers.
 */
export namespace CorrelationFieldsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/CorrelationFields',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Correlation fields for tracing operations across the stack.',
    'properties': {
      'orgId': {
        'description': 'Organization ID for multi-tenant contexts.',
        'type': 'string'
      },
      'requestId': {
        'description': 'Unique request identifier (UUID v4). From X-Request-Id header or generated.',
        'type': 'string'
      },
      'teamId': {
        'description': 'Team ID within organization.',
        'type': 'string'
      },
      'traceId': {
        'description': 'Distributed trace ID for cross-service tracing. From X-Trace-Id header or propagated context.',
        'type': 'string'
      },
      'userId': {
        'description': 'Authenticated user ID.',
        'type': 'string'
      }
    },
    'required': ['requestId'],
    'title': 'CorrelationFields',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/CorrelationFields', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Correlation fields for tracing operations across the stack.', 'title': 'CorrelationFields', 'type': 'object' } as const, { 'orgId': SchemaNode.defineString({
    'description': 'Organization ID for multi-tenant contexts.',
    'type': 'string'
  } as const), 'requestId': SchemaNode.defineString({
    'description': 'Unique request identifier (UUID v4). From X-Request-Id header or generated.',
    'type': 'string'
  } as const), 'teamId': SchemaNode.defineString({
    'description': 'Team ID within organization.',
    'type': 'string'
  } as const), 'traceId': SchemaNode.defineString({
    'description': 'Distributed trace ID for cross-service tracing. From X-Trace-Id header or propagated context.',
    'type': 'string'
  } as const), 'userId': SchemaNode.defineString({
    'description': 'Authenticated user ID.',
    'type': 'string'
  } as const) }, ['requestId'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
