import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { LayerBindingEntity } from '../layers/LayerBindingEntity.js';

/**
 * A matcher for a file permitted to resolve a closed-vocabulary token into an implementation
 * — a composition root. Reuses the layer-binding matcher vocabulary without its `layer`: the
 * question here is binary, so there is no name to resolve to.
 */
export namespace ResolutionSiteEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'pattern': LayerBindingEntity.Schema.properties.pattern,
      'unit': LayerBindingEntity.Schema.properties.unit
    },
    'required': ['unit'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
