import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { DateRangeFilterRuleEntity } from './DateRangeFilterRuleEntity.js';
import { NumericRangeFilterRuleEntity } from './NumericRangeFilterRuleEntity.js';
import { ValueFilterRuleEntity } from './ValueFilterRuleEntity.js';

/** Union of all filter rule types. */
export namespace FilterRuleEntity {
  export const Schema = {
    'oneOf': [DateRangeFilterRuleEntity.Schema, NumericRangeFilterRuleEntity.Schema, ValueFilterRuleEntity.Schema]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
