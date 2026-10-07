import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { drilldownRulesNodes } from '../schema/DrilldownRulesNodes.js';
import { drilldownRulesRemoteSchemas } from '../schema/DrilldownRulesRemoteSchemas.js';
import { GroupValueEntity } from './GroupValueEntity.js';

/** One `group` array entry, derived from `Node`'s own build. */
export namespace GroupRuleEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'groupOutliers': { 'type': 'boolean' },
      'property': { 'type': 'string' },
      'values': { 'items': GroupValueEntity.Schema, 'type': 'array' }
    },
    'required': ['property'],
    'type': 'object'
  } as const;

  export const Node = drilldownRulesNodes.pieces.groupRule;
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema, drilldownRulesRemoteSchemas);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema, drilldownRulesRemoteSchemas);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema, drilldownRulesRemoteSchemas);
}
