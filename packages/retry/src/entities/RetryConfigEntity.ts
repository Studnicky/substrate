import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { DEFAULT_MAXIMUM_RETRIES } from '../constants/index.js';

const HOOK_TIMEOUT_MS_SCHEMA = {
  'description': 'When set, races each lifecycle hook against this timeout (ms); a hook that neither resolves nor rejects in time is treated as a failure',
  'exclusiveMinimum': 0,
  'type': 'integer'
} as const;

const MAXIMUM_ELAPSED_MS_SCHEMA = {
  'description': 'Maximum total elapsed time across all attempts (ms)',
  'minimum': 0,
  'type': 'integer'
} as const;

const MAXIMUM_RETRIES_SCHEMA = {
  'default': DEFAULT_MAXIMUM_RETRIES,
  'description': 'Maximum number of retry attempts',
  'minimum': 0,
  'type': 'integer'
} as const;

export namespace RetryConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RetryConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration for request retry behavior',
    'properties': {
      'hookTimeoutMs': HOOK_TIMEOUT_MS_SCHEMA,
      'maximumElapsedMs': MAXIMUM_ELAPSED_MS_SCHEMA,
      'maximumRetries': MAXIMUM_RETRIES_SCHEMA
    },
    'title': 'RetryConfig',
    'type': 'object'
  } as const;

  /** JSON-serializable retry configuration fields. */
  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/RetryConfig', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Configuration for request retry behavior', 'title': 'RetryConfig', 'type': 'object' } as const, {
    'hookTimeoutMs': SchemaNode.defineNumber(HOOK_TIMEOUT_MS_SCHEMA),
    'maximumElapsedMs': SchemaNode.defineNumber(MAXIMUM_ELAPSED_MS_SCHEMA),
    'maximumRetries': SchemaNode.defineNumber(MAXIMUM_RETRIES_SCHEMA)
  }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
