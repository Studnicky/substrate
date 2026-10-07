import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { drilldownRulesNodes } from '../schema/DrilldownRulesNodes.js';
import { drilldownRulesRemoteSchemas } from '../schema/DrilldownRulesRemoteSchemas.js';
import { AlphabeticGroupValueEntity } from './AlphabeticGroupValueEntity.js';
import { CidrGroupValueEntity } from './CidrGroupValueEntity.js';
import { DateGroupValueEntity } from './DateGroupValueEntity.js';
import { RangeGroupValueEntity } from './RangeGroupValueEntity.js';
import { SemverGroupValueEntity } from './SemverGroupValueEntity.js';
import { SequentialGroupValueEntity } from './SequentialGroupValueEntity.js';
import { StringGroupValueEntity } from './StringGroupValueEntity.js';

/** Union of the seven group-value variants, derived directly from `Node`'s own `defineOneOf` build. */
export namespace GroupValueEntity {
  export const Schema = {
    'oneOf': [
      AlphabeticGroupValueEntity.Schema, CidrGroupValueEntity.Schema, DateGroupValueEntity.Schema, RangeGroupValueEntity.Schema,
      SemverGroupValueEntity.Schema, SequentialGroupValueEntity.Schema, StringGroupValueEntity.Schema
    ]
  } as const;

  export const Node = drilldownRulesNodes.pieces.groupValue;
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema, drilldownRulesRemoteSchemas);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema, drilldownRulesRemoteSchemas);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema, drilldownRulesRemoteSchemas);
}
