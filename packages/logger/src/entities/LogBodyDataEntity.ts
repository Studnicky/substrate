import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * Data structure for a normalized log entry.
 * Root-level fields are indexed by CloudWatch for queries and tables.
 * The context field holds freeform application data as a JSON blob.
 */
export namespace LogBodyDataEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/LogBodyData',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Data structure for a normalized log entry.',
    'properties': {
      'context': {
        'additionalProperties': {},
        'description': 'Freeform application data as a JSON blob.',
        'type': 'object'
      },
      'durationMs': {
        'description': 'Duration in milliseconds.',
        'minimum': 0,
        'type': 'number'
      },
      'event': {
        'description': 'Hierarchical event identifier: component.operation',
        'type': 'string'
      },
      'message': {
        'description': 'Human-readable log message.',
        'type': 'string'
      },
      'status': {
        'description': 'Operation outcome (semantic, not HTTP-specific)',
        'enum': [
          'cached', 'complete', 'failed', 'in_progress', 'invalid', 'not_found', 'partial',
          'pending', 'rate_limited', 'retry_exhausted', 'retrying', 'skipped', 'success',
          'timeout', 'unauthorized', 'unavailable'
        ],
        'type': 'string'
      }
    },
    'required': ['context', 'event', 'message', 'status'],
    'title': 'LogBodyData',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/LogBodyData', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Data structure for a normalized log entry.', 'title': 'LogBodyData', 'type': 'object' } as const, { 'context': SchemaNode.defineObject({ 'description': 'Freeform application data as a JSON blob.', 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': SchemaNode.defineUnknown({} as const) }), 'durationMs': SchemaNode.defineNumber({
    'description': 'Duration in milliseconds.',
    'minimum': 0,
    'type': 'number'
  } as const), 'event': SchemaNode.defineString({
    'description': 'Hierarchical event identifier: component.operation',
    'type': 'string'
  } as const), 'message': SchemaNode.defineString({
    'description': 'Human-readable log message.',
    'type': 'string'
  } as const), 'status': SchemaNode.defineEnum([
    'cached', 'complete', 'failed', 'in_progress', 'invalid', 'not_found', 'partial',
    'pending', 'rate_limited', 'retry_exhausted', 'retrying', 'skipped', 'success',
    'timeout', 'unauthorized', 'unavailable'
  ] as const) }, ['context', 'event', 'message', 'status'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
