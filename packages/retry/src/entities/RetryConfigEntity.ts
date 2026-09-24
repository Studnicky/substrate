import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace RetryConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RetryConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration for request retry behavior',
    'properties': {
      'hookTimeoutMs': {
        'description': 'When set, races each lifecycle hook against this timeout (ms); a hook that neither resolves nor rejects in time is treated as a failure',
        'exclusiveMinimum': 0,
        'type': 'integer'
      },
      'maximumElapsedMs': {
        'description': 'Maximum total elapsed time across all attempts (ms)',
        'minimum': 0,
        'type': 'integer'
      },
      'maximumRetries': {
        'description': 'Maximum number of retry attempts',
        'minimum': 0,
        'type': 'integer'
      }
    },
    'title': 'RetryConfig',
    'type': 'object'
  } as const;

  /** JSON-serializable retry configuration fields. */
  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/RetryConfig', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Configuration for request retry behavior', 'title': 'RetryConfig', 'type': 'object' } as const, { 'hookTimeoutMs': SchemaNode.defineNumber({
    'description': 'When set, races each lifecycle hook against this timeout (ms); a hook that neither resolves nor rejects in time is treated as a failure',
    'exclusiveMinimum': 0,
    'type': 'integer'
  } as const), 'maximumElapsedMs': SchemaNode.defineNumber({
    'description': 'Maximum total elapsed time across all attempts (ms)',
    'minimum': 0,
    'type': 'integer'
  } as const), 'maximumRetries': SchemaNode.defineNumber({
    'description': 'Maximum number of retry attempts',
    'minimum': 0,
    'type': 'integer'
  } as const) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
