import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { DEFAULT_POLL_MS, DEFAULT_TIMEOUT_MS } from '../constants/FileLockDefaults.js';

export namespace FileLockOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'path': { 'minLength': 1, 'type': 'string' },
      'pollMs': { 'default': DEFAULT_POLL_MS, 'exclusiveMinimum': 0, 'type': 'number' },
      'timeoutMs': { 'default': DEFAULT_TIMEOUT_MS, 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'required': ['path'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'pollMs': SchemaNode.defineNumber({
        'default': DEFAULT_POLL_MS,
        'exclusiveMinimum': 0,
        'type': 'number'
      } as const),
      'timeoutMs': SchemaNode.defineNumber({
        'default': DEFAULT_TIMEOUT_MS,
        'exclusiveMinimum': 0,
        'type': 'number'
      } as const)
    },
    ['path'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> =
    EntityCompiler.compileCreate<Type, InputType>(Schema);
}
