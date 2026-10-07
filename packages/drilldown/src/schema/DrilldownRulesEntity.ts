import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { DRILLDOWN_DEFAULTS } from '../constants/index.js';
import { AlphabeticRangeEntity } from '../entities/AlphabeticRangeEntity.js';
import { CidrRangeEntity } from '../entities/CidrRangeEntity.js';
import { DateRangeEntity } from '../entities/DateRangeEntity.js';
import { FilterRuleEntity } from '../entities/FilterRuleEntity.js';
import { RangeEntity } from '../entities/RangeEntity.js';
import { SemverRangeEntity } from '../entities/SemverRangeEntity.js';
import { SequentialRangeEntity } from '../entities/SequentialRangeEntity.js';
import { SortRuleEntity } from '../entities/SortRuleEntity.js';
import { drilldownRulesNodes } from './DrilldownRulesNodes.js';

const alphabeticGroupValueSchema = {
  'additionalProperties': false,
  'properties': { ...AlphabeticRangeEntity.Schema.properties, 'rules': { '$ref': DRILLDOWN_DEFAULTS.drilldownRulesSchemaId, 'title': 'DrilldownNestedRules' }, 'type': { 'const': 'alphabetic' } },
  'required': [...AlphabeticRangeEntity.Schema.required, 'type'],
  'type': 'object'
} as const;

const cidrGroupValueSchema = {
  'additionalProperties': false,
  'properties': { ...CidrRangeEntity.Schema.properties, 'rules': { '$ref': DRILLDOWN_DEFAULTS.drilldownRulesSchemaId, 'title': 'DrilldownNestedRules' }, 'type': { 'const': 'cidr' } },
  'required': [...CidrRangeEntity.Schema.required, 'type'],
  'type': 'object'
} as const;

const dateGroupValueSchema = {
  'additionalProperties': false,
  'properties': { ...DateRangeEntity.Schema.properties, 'rules': { '$ref': DRILLDOWN_DEFAULTS.drilldownRulesSchemaId, 'title': 'DrilldownNestedRules' }, 'type': { 'const': 'date' } },
  'required': [...DateRangeEntity.Schema.required, 'type'],
  'type': 'object'
} as const;

const rangeGroupValueSchema = {
  'additionalProperties': false,
  'properties': { ...RangeEntity.Schema.properties, 'rules': { '$ref': DRILLDOWN_DEFAULTS.drilldownRulesSchemaId, 'title': 'DrilldownNestedRules' }, 'type': { 'const': 'range' } },
  'required': [...RangeEntity.Schema.required, 'type'],
  'type': 'object'
} as const;

const semverGroupValueSchema = {
  'additionalProperties': false,
  'properties': { ...SemverRangeEntity.Schema.properties, 'rules': { '$ref': DRILLDOWN_DEFAULTS.drilldownRulesSchemaId, 'title': 'DrilldownNestedRules' }, 'type': { 'const': 'semver' } },
  'required': [...SemverRangeEntity.Schema.required, 'type'],
  'type': 'object'
} as const;

const sequentialGroupValueSchema = {
  'additionalProperties': false,
  'properties': { 'rules': { '$ref': DRILLDOWN_DEFAULTS.drilldownRulesSchemaId, 'title': 'DrilldownNestedRules' }, 'sequential': SequentialRangeEntity.Schema, 'type': { 'const': 'sequential' } },
  'required': ['sequential', 'type'],
  'type': 'object'
} as const;

const stringGroupValueSchema = {
  'additionalProperties': false,
  'properties': { 'match': { 'type': 'string' }, 'rules': { '$ref': DRILLDOWN_DEFAULTS.drilldownRulesSchemaId, 'title': 'DrilldownNestedRules' }, 'type': { 'const': 'string' } },
  'required': ['match', 'type'],
  'type': 'object'
} as const;

const groupValueSchema = {
  'oneOf': [
    alphabeticGroupValueSchema, cidrGroupValueSchema, dateGroupValueSchema, rangeGroupValueSchema,
    semverGroupValueSchema, sequentialGroupValueSchema, stringGroupValueSchema
  ]
} as const;

const groupRuleSchema = {
  'additionalProperties': false,
  'properties': {
    'groupOutliers': { 'type': 'boolean' },
    'property': { 'type': 'string' },
    'values': { 'items': groupValueSchema, 'type': 'array' }
  },
  'required': ['property'],
  'type': 'object'
} as const;

/** Self-referential schema-derived rules for a drilldown operation. Each group-value variant is its own flat entity in `entities/` — see `AlphabeticGroupValueEntity.ts` and siblings — sharing this file's `Node` through `drilldownRulesNodes` and this file's `$id` through `remoteSchemas`. */
/** `group` can't compose `GroupRuleEntity.Schema`: a value cycle survives past the `$id` extraction — `GroupRuleEntity.ts` needs `DrilldownRulesRemoteSchemas.ts`, whose map needs this `.Schema` fully built (proven: `TypeError: Cannot read properties of undefined (reading 'Schema')` at `DrilldownRulesRemoteSchemas.ts:4`). Unbreakable by restructuring while `compile()` runs eagerly at import; resolves once entity compilation is lazy (queued post-v13). Seven local schema literals below are a deliberate second source until then. */
export namespace DrilldownRulesEntity {
  export const Schema = {
    '$id': DRILLDOWN_DEFAULTS.drilldownRulesSchemaId,
    'additionalProperties': false,
    'properties': {
      'filter': { 'items': FilterRuleEntity.Schema, 'type': 'array' },
      'group': { 'items': groupRuleSchema, 'type': 'array' },
      'sort': { 'items': SortRuleEntity.Schema, 'type': 'array' }
    },
    'type': 'object'
  } as const;

  export const Node = drilldownRulesNodes.node;
  export type Type = NodeStaticType<typeof Node>;

  /** Shared with `DrillDownConfigEntity`'s own `filter` property — both compose the same three variants. */
  export const FilterRuleNode = drilldownRulesNodes.filterSort.filterRuleNode;
  export const SortRuleNode = drilldownRulesNodes.filterSort.sortRuleNode;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
