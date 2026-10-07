import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { DRILLDOWN_DEFAULTS } from '../constants/index.js';
import { drilldownRulesNodes } from '../schema/DrilldownRulesNodes.js';
import { drilldownRulesRemoteSchemas } from '../schema/DrilldownRulesRemoteSchemas.js';
import { SequentialRangeEntity } from './SequentialRangeEntity.js';

/** One discriminated branch of `DrilldownRulesEntity.GroupValueEntity.Type`; its `rules` field resolves `DrilldownRulesEntity.Schema` by absolute `$id` through `remoteSchemas`. */
export namespace SequentialGroupValueEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'rules': { '$ref': DRILLDOWN_DEFAULTS.drilldownRulesSchemaId, 'title': 'DrilldownNestedRules' }, 'sequential': SequentialRangeEntity.Schema, 'type': { 'const': 'sequential' } },
    'required': ['sequential', 'type'],
    'type': 'object'
  } as const;

  export const Node = drilldownRulesNodes.pieces.sequentialGroupValue;
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema, drilldownRulesRemoteSchemas);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema, drilldownRulesRemoteSchemas);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema, drilldownRulesRemoteSchemas);
}
