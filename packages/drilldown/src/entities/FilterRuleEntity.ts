import type { SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { DateRangeFilterRuleEntity } from './DateRangeFilterRuleEntity.js';
import { NumericRangeFilterRuleEntity } from './NumericRangeFilterRuleEntity.js';
import { ValueFilterRuleEntity } from './ValueFilterRuleEntity.js';

/** Union of all filter rule types. */
export namespace FilterRuleEntity {
  export const Schema = {
    'oneOf': [DateRangeFilterRuleEntity.Schema, NumericRangeFilterRuleEntity.Schema, ValueFilterRuleEntity.Schema]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
}
