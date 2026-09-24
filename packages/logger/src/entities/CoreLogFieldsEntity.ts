import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * Core fields present on EVERY log record.
 * These enable filtering, correlation, and CloudWatch indexing.
 */
export namespace CoreLogFieldsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/CoreLogFields',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Core log fields present on every normalized log record.',
    'properties': {
      'event': {
        'description': 'Hierarchical event identifier: component.operation',
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
    'required': ['event', 'status'],
    'title': 'CoreLogFields',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/CoreLogFields', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Core log fields present on every normalized log record.', 'title': 'CoreLogFields', 'type': 'object' } as const, { 'event': SchemaNode.defineString({
    'description': 'Hierarchical event identifier: component.operation',
    'type': 'string'
  } as const), 'status': SchemaNode.defineEnum([
    'cached', 'complete', 'failed', 'in_progress', 'invalid', 'not_found', 'partial',
    'pending', 'rate_limited', 'retry_exhausted', 'retrying', 'skipped', 'success',
    'timeout', 'unauthorized', 'unavailable'
  ] as const) }, ['event', 'status'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
