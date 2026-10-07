import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { ValidatedAdaptiveConfigEntity } from './ValidatedAdaptiveConfigEntity.js';

/** Fully defaulted configuration retained by a throttle instance. */
export namespace ValidatedThrottleConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'adaptive': ValidatedAdaptiveConfigEntity.Schema,
      'concurrencyLimit': {
        'description': 'Maximum number of concurrent operations.',
        'minimum': 1,
        'type': 'integer'
      }
    },
    'required': ['concurrencyLimit'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'adaptive': ValidatedAdaptiveConfigEntity.Node,
    'concurrencyLimit': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const)
  }, ['concurrencyLimit'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  /** Not-yet-validated construction data — the shape a caller assembling a config by hand supplies to {@link create}. */
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
