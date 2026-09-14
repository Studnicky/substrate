import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json/node';

import { AlphabeticRangeEntity } from '../entities/AlphabeticRangeEntity.js';
import { CidrRangeEntity } from '../entities/CidrRangeEntity.js';
import { DateRangeEntity } from '../entities/DateRangeEntity.js';
import { FilterRuleEntity } from '../entities/FilterRuleEntity.js';
import { RangeEntity } from '../entities/RangeEntity.js';
import { SemverRangeEntity } from '../entities/SemverRangeEntity.js';
import { SequentialRangeEntity } from '../entities/SequentialRangeEntity.js';
import { SortRuleEntity } from '../entities/SortRuleEntity.js';

/** Self-referential schema-derived rules for a drilldown operation. */
export namespace DrilldownRulesEntity {
  const selfPointerKey = '$ref';
  const nestedRules: { 'title': 'DrilldownNestedRules' } = { 'title': 'DrilldownNestedRules' };

  Object.defineProperty(nestedRules, selfPointerKey, { 'enumerable': true, 'value': '#' });

  export namespace AlphabeticGroupValueEntity {
    export const Schema = {
      'additionalProperties': false,
      'properties': { ...AlphabeticRangeEntity.Schema.properties, 'rules': nestedRules, 'type': { 'const': 'alphabetic' } },
      'required': [...AlphabeticRangeEntity.Schema.required, 'type'],
      'type': 'object'
    } as const satisfies JSONSchema;

    export interface Type extends FromSchema<
      typeof Schema,
      { 'deserialize': [{ 'output': DrilldownRulesEntity.Type; 'pattern': { 'title': 'DrilldownNestedRules' } }] }
    > {}
  }

  export namespace CidrGroupValueEntity {
    export const Schema = {
      'additionalProperties': false,
      'properties': { ...CidrRangeEntity.Schema.properties, 'rules': nestedRules, 'type': { 'const': 'cidr' } },
      'required': [...CidrRangeEntity.Schema.required, 'type'],
      'type': 'object'
    } as const satisfies JSONSchema;

    export interface Type extends FromSchema<
      typeof Schema,
      { 'deserialize': [{ 'output': DrilldownRulesEntity.Type; 'pattern': { 'title': 'DrilldownNestedRules' } }] }
    > {}
  }

  export namespace DateGroupValueEntity {
    export const Schema = {
      'additionalProperties': false,
      'properties': { ...DateRangeEntity.Schema.properties, 'rules': nestedRules, 'type': { 'const': 'date' } },
      'required': [...DateRangeEntity.Schema.required, 'type'],
      'type': 'object'
    } as const satisfies JSONSchema;

    export interface Type extends FromSchema<
      typeof Schema,
      { 'deserialize': [{ 'output': DrilldownRulesEntity.Type; 'pattern': { 'title': 'DrilldownNestedRules' } }] }
    > {}
  }

  export namespace RangeGroupValueEntity {
    export const Schema = {
      'additionalProperties': false,
      'properties': { ...RangeEntity.Schema.properties, 'rules': nestedRules, 'type': { 'const': 'range' } },
      'required': [...RangeEntity.Schema.required, 'type'],
      'type': 'object'
    } as const satisfies JSONSchema;

    export interface Type extends FromSchema<
      typeof Schema,
      { 'deserialize': [{ 'output': DrilldownRulesEntity.Type; 'pattern': { 'title': 'DrilldownNestedRules' } }] }
    > {}
  }

  export namespace SemverGroupValueEntity {
    export const Schema = {
      'additionalProperties': false,
      'properties': { ...SemverRangeEntity.Schema.properties, 'rules': nestedRules, 'type': { 'const': 'semver' } },
      'required': [...SemverRangeEntity.Schema.required, 'type'],
      'type': 'object'
    } as const satisfies JSONSchema;

    export interface Type extends FromSchema<
      typeof Schema,
      { 'deserialize': [{ 'output': DrilldownRulesEntity.Type; 'pattern': { 'title': 'DrilldownNestedRules' } }] }
    > {}
  }

  export namespace SequentialGroupValueEntity {
    export const Schema = {
      'additionalProperties': false,
      'properties': {
        'rules': nestedRules,
        'sequential': SequentialRangeEntity.Schema,
        'type': { 'const': 'sequential' }
      },
      'required': ['sequential', 'type'],
      'type': 'object'
    } as const satisfies JSONSchema;

    export interface Type extends FromSchema<
      typeof Schema,
      { 'deserialize': [{ 'output': DrilldownRulesEntity.Type; 'pattern': { 'title': 'DrilldownNestedRules' } }] }
    > {}
  }

  export namespace StringGroupValueEntity {
    export const Schema = {
      'additionalProperties': false,
      'properties': {
        'match': { 'type': 'string' },
        'rules': nestedRules,
        'type': { 'const': 'string' }
      },
      'required': ['match', 'type'],
      'type': 'object'
    } as const satisfies JSONSchema;

    export interface Type extends FromSchema<
      typeof Schema,
      { 'deserialize': [{ 'output': DrilldownRulesEntity.Type; 'pattern': { 'title': 'DrilldownNestedRules' } }] }
    > {}
  }

  export namespace GroupValueEntity {
    export const Schema = {
      'oneOf': [
        AlphabeticGroupValueEntity.Schema,
        CidrGroupValueEntity.Schema,
        DateGroupValueEntity.Schema,
        RangeGroupValueEntity.Schema,
        SemverGroupValueEntity.Schema,
        SequentialGroupValueEntity.Schema,
        StringGroupValueEntity.Schema
      ]
    } as const satisfies JSONSchema;

    export type Type = FromSchema<
      typeof Schema,
      { 'deserialize': [{ 'output': DrilldownRulesEntity.Type; 'pattern': { 'title': 'DrilldownNestedRules' } }] }
    >;
  }

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
    } as const satisfies JSONSchema;

    export type Type = FromSchema<
      typeof Schema,
      { 'deserialize': [{ 'output': DrilldownRulesEntity.Type; 'pattern': { 'title': 'DrilldownNestedRules' } }] }
    >;
  }

  export const Schema = {
    '$id': 'urn:studnicky:drilldown:rules',
    'additionalProperties': false,
    'properties': {
      'filter': { 'items': FilterRuleEntity.Schema, 'type': 'array' },
      'group': { 'items': GroupRuleEntity.Schema, 'type': 'array' },
      'sort': { 'items': SortRuleEntity.Schema, 'type': 'array' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export interface Type extends FromSchema<
    typeof Schema,
    { 'deserialize': [{ 'output': Type; 'pattern': { 'title': 'DrilldownNestedRules' } }] }
  > {}

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
