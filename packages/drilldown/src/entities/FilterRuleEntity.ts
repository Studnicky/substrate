import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { DateRangeFilterRuleEntity } from './DateRangeFilterRuleEntity.js';
import { NumericRangeFilterRuleEntity } from './NumericRangeFilterRuleEntity.js';
import { ValueFilterRuleEntity } from './ValueFilterRuleEntity.js';

/** Union of all filter rule types. */
export namespace FilterRuleEntity {
  export const Schema = {
    'oneOf': [DateRangeFilterRuleEntity.Schema, NumericRangeFilterRuleEntity.Schema, ValueFilterRuleEntity.Schema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [DateRangeFilterRuleEntity.Node, NumericRangeFilterRuleEntity.Node, ValueFilterRuleEntity.Node]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
