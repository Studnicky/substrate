import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace VisibleRangeResolvedConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'count': { 'minimum': 0, 'type': 'integer' },
      'itemSize': { 'exclusiveMinimum': 0, 'type': 'number' },
      'mode': { 'enum': ['fixed', 'variable'], 'type': 'string' },
      'overscan': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['count', 'mode', 'overscan'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Serializable state retained after visible-range configuration resolves. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
