import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { CoalesceKeyVariantEntity } from './CoalesceKeyVariantEntity.js';

/** Canonical per-key lifecycle state for Coalesce. */
export namespace CoalesceKeyStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'variant': CoalesceKeyVariantEntity.Schema
    },
    'required': ['variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
