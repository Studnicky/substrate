import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Mutable schema-validatable fields carried by a retry lifecycle context. */
export namespace RetryContextDataEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RetryContextData',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'abort': { 'type': 'boolean' },
      'attemptNumber': { 'minimum': 0, 'type': 'integer' },
      'delayMs': { 'minimum': 0, 'type': 'number' },
      'elapsedMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['attemptNumber', 'delayMs', 'elapsedMs'],
    'title': 'RetryContextData',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/RetryContextData', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'RetryContextData', 'type': 'object' } as const, { 'abort': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'attemptNumber': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'delayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'elapsedMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, ['attemptNumber', 'delayMs', 'elapsedMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
