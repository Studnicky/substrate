import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { DEFAULT_DECIMAL_PRECISION, VALID_TIME_UNITS } from '../constants/index.js';

/** Decimal precision configuration keyed by supported time unit. */
export namespace TimingPrecisionEntity {
  const PrecisionPropertySchema = {
    'maximum': 20,
    'minimum': 0,
    'type': 'integer'
  } as const;

  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Decimal precision configuration per time unit (h, m, ms, ns, s).',
    'properties': {
      'h': { ...PrecisionPropertySchema, 'default': DEFAULT_DECIMAL_PRECISION.h },
      'm': { ...PrecisionPropertySchema, 'default': DEFAULT_DECIMAL_PRECISION.m },
      'ms': { ...PrecisionPropertySchema, 'default': DEFAULT_DECIMAL_PRECISION.ms },
      'ns': { ...PrecisionPropertySchema, 'default': DEFAULT_DECIMAL_PRECISION.ns },
      's': { ...PrecisionPropertySchema, 'default': DEFAULT_DECIMAL_PRECISION.s }
    },
    'propertyNames': { 'enum': VALID_TIME_UNITS },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
