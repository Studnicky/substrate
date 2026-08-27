import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { AlphabeticRangeEntity } from '../entities/AlphabeticRangeEntity.js';
import { CidrRangeEntity } from '../entities/CidrRangeEntity.js';
import { DateRangeEntity } from '../entities/DateRangeEntity.js';
import { FilterRuleEntity } from '../entities/FilterRuleEntity.js';
import { RangeEntity } from '../entities/RangeEntity.js';
import { SemverRangeEntity } from '../entities/SemverRangeEntity.js';
import { SequentialRangeEntity } from '../entities/SequentialRangeEntity.js';
import { SortRuleEntity } from '../entities/SortRuleEntity.js';

/**
 * Rule graph for a drilldown operation. A group value may carry its own nested
 * `rules`, which can themselves declare group values that carry rules — a
 * genuinely, unboundedly recursive shape: a consumer discovers N drillable
 * properties and can nest that many levels deep, so the recursion is not
 * incidental, it is the point.
 *
 * Kept out of `entities/` and off the `*Entity.ts` basename: it uses the
 * `interface Type extends F<typeof Schema> {}` canonical entity form (the
 * only way to make `Type` self-referential — see below), which the simpler,
 * folder-scoped entity-file checker doesn't recognize, unlike the shared
 * type classifier that governs `all-types-are-entities`/`type-alias-invariants`
 * and does.
 *
 * json-schema-to-ts cannot structurally expand a true `$ref` self-reference
 * into a TS type — `ParseSchema`'s result is computed as an eager default
 * type-parameter value before any `deserialize` override is applied (verified
 * against its own .d.ts source), so it recurses without terminating regardless
 * of any override. The fix: `nestedRules` is typed (via `as`) as bare
 * `{ 'title': ... }` — no `$ref` — so `FromSchema` never enters its
 * reference-parsing branch for this node, while the *runtime* object literal
 * still carries the real `'$ref': '#'` for ajv, which resolves `$ref`
 * per-document and validates it correctly and unboundedly (a TS type
 * annotation never strips a value's actual runtime properties). `deserialize`
 * then substitutes the real, natively self-referential `Type` at that node for
 * the compile-time shape — TypeScript resolves a named type referencing itself
 * in a lazily-evaluated position without limit, unlike the schema-driven
 * structural walk. Verified directly (see the type + ajv depth test in
 * tests/unit/DrilldownRulesEntity.test.ts): a 5-level-deep rules tree
 * typechecks correctly, rejects a wrong field 5 levels deep at compile time,
 * and ajv rejects a structurally invalid value 2+ levels deep at runtime.
 */
export namespace DrilldownRulesEntity {
  const selfPointerKey = '$ref';
  const nestedRules = { 'title': 'DrilldownNestedRules' } as { 'title': 'DrilldownNestedRules' };

  Object.defineProperty(nestedRules, selfPointerKey, { 'enumerable': true, 'value': '#' });

  export const Schema = {
    '$id': 'urn:studnicky:drilldown:rules',
    'additionalProperties': false,
    'properties': {
      'filter': {
        'items': FilterRuleEntity.Schema,
        'type': 'array'
      },
      'group': {
        'items': {
          'additionalProperties': false,
          'properties': {
            'groupOutliers': { 'type': 'boolean' },
            'property': { 'type': 'string' },
            'values': {
              'items': {
                'oneOf': [
                  {
                    'additionalProperties': false,
                    'properties': { ...AlphabeticRangeEntity.Schema.properties, 'rules': nestedRules, 'type': { 'const': 'alphabetic' } },
                    'required': [...AlphabeticRangeEntity.Schema.required, 'type'],
                    'type': 'object'
                  },
                  {
                    'additionalProperties': false,
                    'properties': { ...CidrRangeEntity.Schema.properties, 'rules': nestedRules, 'type': { 'const': 'cidr' } },
                    'required': [...CidrRangeEntity.Schema.required, 'type'],
                    'type': 'object'
                  },
                  {
                    'additionalProperties': false,
                    'properties': { ...DateRangeEntity.Schema.properties, 'rules': nestedRules, 'type': { 'const': 'date' } },
                    'required': [...DateRangeEntity.Schema.required, 'type'],
                    'type': 'object'
                  },
                  {
                    'additionalProperties': false,
                    'properties': { ...RangeEntity.Schema.properties, 'rules': nestedRules, 'type': { 'const': 'range' } },
                    'required': [...RangeEntity.Schema.required, 'type'],
                    'type': 'object'
                  },
                  {
                    'additionalProperties': false,
                    'properties': { ...SemverRangeEntity.Schema.properties, 'rules': nestedRules, 'type': { 'const': 'semver' } },
                    'required': [...SemverRangeEntity.Schema.required, 'type'],
                    'type': 'object'
                  },
                  {
                    'additionalProperties': false,
                    'properties': {
                      'rules': nestedRules,
                      'sequential': SequentialRangeEntity.Schema,
                      'type': { 'const': 'sequential' }
                    },
                    'required': ['sequential', 'type'],
                    'type': 'object'
                  },
                  {
                    'additionalProperties': false,
                    'properties': {
                      'match': { 'type': 'string' },
                      'rules': nestedRules,
                      'type': { 'const': 'string' }
                    },
                    'required': ['match', 'type'],
                    'type': 'object'
                  }
                ]
              },
              'type': 'array'
            }
          },
          'required': ['property'],
          'type': 'object'
        },
        'type': 'array'
      },
      'sort': { 'items': SortRuleEntity.Schema, 'type': 'array' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  // `interface Type extends F<typeof Schema> {}` is the other canonical entity form (alongside
  // `type Type = F<typeof Schema>`) — required here because a type alias cannot reference its
  // own name inside its own type arguments, but an interface can extend a type that does.
  export interface Type extends FromSchema<
    typeof Schema,
    { 'deserialize': [{ 'output': Type; 'pattern': { 'title': 'DrilldownNestedRules' } }] }
  > {}

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
