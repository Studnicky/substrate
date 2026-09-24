import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace HealthCheckOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/HealthCheckOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Per-check options accepted by HealthRegistry#register()',
    'properties': {
      'timeoutMs': {
        'description': "Milliseconds allowed for this check to settle before it is treated as 'unhealthy' with timeout metadata. No default — a check with no timeoutMs runs unbounded.",
        'minimum': 0,
        'type': 'integer'
      }
    },
    'title': 'HealthCheckOptions',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/HealthCheckOptions', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Per-check options accepted by HealthRegistry#register()', 'title': 'HealthCheckOptions', 'type': 'object' } as const, { 'timeoutMs': SchemaNode.defineNumber({
    'description': "Milliseconds allowed for this check to settle before it is treated as 'unhealthy' with timeout metadata. No default — a check with no timeoutMs runs unbounded.",
    'minimum': 0,
    'type': 'integer'
  } as const) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
