import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Configuration options for the automatic grouping algorithm. */
export namespace GroupingOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'excludeProperties': { 'items': { 'type': 'string' }, 'type': 'array' },
      'groupCount': { 'type': 'integer' },
      'hideSingleValueGroups': { 'type': 'boolean' },
      'maximumDepth': { 'type': 'integer' },
      'minimumGroupSize': { 'type': 'integer' },
      'numericGrouping': { 'type': 'boolean' },
      'propertyPriority': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
