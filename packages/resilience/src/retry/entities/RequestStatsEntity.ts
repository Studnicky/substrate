import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace RequestStatsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RequestStats',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Statistics for request executor',
    'properties': {
      'failedRequests': {
        'description': 'Total number of requests that failed (after all retries)',
        'minimum': 0,
        'type': 'integer'
      },
      'successfulRequests': {
        'description': 'Total number of requests that succeeded',
        'minimum': 0,
        'type': 'integer'
      },
      'totalRequests': {
        'description': 'Total number of requests executed',
        'minimum': 0,
        'type': 'integer'
      },
      'totalRetries': {
        'description': 'Total number of retry attempts made',
        'minimum': 0,
        'type': 'integer'
      }
    },
    'required': ['failedRequests', 'successfulRequests', 'totalRequests', 'totalRetries'],
    'title': 'RequestStats',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/RequestStats', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Statistics for request executor', 'title': 'RequestStats', 'type': 'object' } as const, { 'failedRequests': SchemaNode.defineNumber({
    'description': 'Total number of requests that failed (after all retries)',
    'minimum': 0,
    'type': 'integer'
  } as const), 'successfulRequests': SchemaNode.defineNumber({
    'description': 'Total number of requests that succeeded',
    'minimum': 0,
    'type': 'integer'
  } as const), 'totalRequests': SchemaNode.defineNumber({
    'description': 'Total number of requests executed',
    'minimum': 0,
    'type': 'integer'
  } as const), 'totalRetries': SchemaNode.defineNumber({
    'description': 'Total number of retry attempts made',
    'minimum': 0,
    'type': 'integer'
  } as const) }, ['failedRequests', 'successfulRequests', 'totalRequests', 'totalRetries'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
