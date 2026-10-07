import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Canonical bounds for the per-key strategy registry. */
export namespace KeyedRateLimiterRegistryOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'keyIdleTtlMs': { 'minimum': 0, 'type': 'number' },
      'maximumKeys': { 'minimum': 1, 'type': 'integer' }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'keyIdleTtlMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'maximumKeys': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
