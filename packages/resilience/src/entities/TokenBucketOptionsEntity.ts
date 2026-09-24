import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace TokenBucketOptionsEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'burstSize': { 'minimum': 1, 'type': 'integer' },
      'requestsPerSecond': { 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'required': ['burstSize', 'requestsPerSecond'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$schema': 'https://json-schema.org/draft/2020-12/schema', 'type': 'object' } as const, { 'burstSize': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'requestsPerSecond': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'number' } as const) }, ['burstSize', 'requestsPerSecond'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
