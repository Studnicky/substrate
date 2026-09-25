import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { DRILLDOWN_DEFAULTS } from '../constants/index.js';
import { drilldownRulesNodes } from '../schema/DrilldownRulesNodes.js';
import { drilldownRulesRemoteSchemas } from '../schema/DrilldownRulesRemoteSchemas.js';
import { AlphabeticRangeEntity } from './AlphabeticRangeEntity.js';

/** One discriminated branch of `DrilldownRulesEntity.GroupValueEntity.Type`; its `rules` field resolves `DrilldownRulesEntity.Schema` by absolute `$id` through `remoteSchemas`, proven to work for a self-referential cross-document reference. */
export namespace AlphabeticGroupValueEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { ...AlphabeticRangeEntity.Schema.properties, 'rules': { '$ref': DRILLDOWN_DEFAULTS.drilldownRulesSchemaId, 'title': 'DrilldownNestedRules' }, 'type': { 'const': 'alphabetic' } },
    'required': [...AlphabeticRangeEntity.Schema.required, 'type'],
    'type': 'object'
  } as const;

  export const Node = drilldownRulesNodes.pieces.alphabeticGroupValue;
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema, drilldownRulesRemoteSchemas);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema, drilldownRulesRemoteSchemas);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema, drilldownRulesRemoteSchemas);
}
