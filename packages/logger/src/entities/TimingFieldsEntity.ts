import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * Timing fields for operations with measurable duration.
 * Include on completion events, not start events.
 */
export namespace TimingFieldsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/TimingFields',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Timing fields for operations with measurable duration.',
    'properties': {
      'durationMs': {
        'description': 'Duration in milliseconds. ALWAYS use this field name for timing.',
        'minimum': 0,
        'type': 'number'
      }
    },
    'required': ['durationMs'],
    'title': 'TimingFields',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/TimingFields', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Timing fields for operations with measurable duration.', 'title': 'TimingFields', 'type': 'object' } as const, { 'durationMs': SchemaNode.defineNumber({
    'description': 'Duration in milliseconds. ALWAYS use this field name for timing.',
    'minimum': 0,
    'type': 'number'
  } as const) }, ['durationMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
