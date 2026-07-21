import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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
      'h': PrecisionPropertySchema,
      'm': PrecisionPropertySchema,
      'ms': PrecisionPropertySchema,
      'ns': PrecisionPropertySchema,
      's': PrecisionPropertySchema
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
