import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
