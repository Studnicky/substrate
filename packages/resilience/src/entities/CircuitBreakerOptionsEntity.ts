import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace CircuitBreakerOptionsEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'failureThreshold': { 'minimum': 1, 'type': 'integer' },
      'name': { 'type': 'string' },
      'resetTimeoutMs': { 'minimum': 0, 'type': 'integer' },
      'successThreshold': { 'minimum': 1, 'type': 'integer' }
    },
    'required': ['failureThreshold', 'resetTimeoutMs'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$schema': 'https://json-schema.org/draft/2020-12/schema', 'type': 'object' } as const, { 'failureThreshold': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'resetTimeoutMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'successThreshold': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const) }, ['failureThreshold', 'resetTimeoutMs'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
