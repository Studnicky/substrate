import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

/** Options accepted by the `Pipeline` constructor. */
export namespace PipelineOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/PipelineOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'hookTimeoutMs': {
        'description': 'When set, races each void observer hook (onStageStart, onStageSuccess, onStageError, onRunError) against this timeout in milliseconds; a hook that neither resolves nor rejects in time fails through onHookError with a HookTimeoutError cause. Left unset, a hook may take arbitrarily long.',
        'exclusiveMinimum': 0,
        'type': 'integer'
      }
    },
    'title': 'PipelineOptions',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
