import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { DRILLDOWN_DEFAULTS } from '../constants/index.js';
import { drilldownRulesNodes } from '../schema/DrilldownRulesNodes.js';
import { drilldownRulesRemoteSchemas } from '../schema/DrilldownRulesRemoteSchemas.js';

/** One discriminated branch of `DrilldownRulesEntity.GroupValueEntity.Type`; its `rules` field resolves `DrilldownRulesEntity.Schema` by absolute `$id` through `remoteSchemas`. */
export namespace StringGroupValueEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'match': { 'type': 'string' }, 'rules': { '$ref': DRILLDOWN_DEFAULTS.drilldownRulesSchemaId, 'title': 'DrilldownNestedRules' }, 'type': { 'const': 'string' } },
    'required': ['match', 'type'],
    'type': 'object'
  } as const;

  export const Node = drilldownRulesNodes.pieces.stringGroupValue;
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema, drilldownRulesRemoteSchemas);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema, drilldownRulesRemoteSchemas);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema, drilldownRulesRemoteSchemas);
}
