import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';

import { RuntimeError } from '@studnicky/errors/browser';
import { SchemaNode } from '@studnicky/entity/types';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NodeSchemaAgreement } from '../../src/NodeSchemaAgreement.js';
import { AddScenarioCaseEntity } from './fixtures/AddScenarioCaseEntity.js';
import { ArithmeticScenarioCaseEntity } from './fixtures/ArithmeticScenarioCaseEntity.js';
import { SumScenarioCaseEntity } from './fixtures/SumScenarioCaseEntity.js';

/** `patternProperties` is outside this check's scope — a correctly-authored pair using it must still fail. */
const patternPropertiesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': { '^.*$': SchemaNode.defineString({ 'type': 'string' } as const) } });
const patternPropertiesSchema = {
  'additionalProperties': false,
  'patternProperties': { '^.*$': { 'type': 'string' } },
  'properties': {},
  'required': [],
  'type': 'object'
} as const;

type ScenarioCase =
  | { description: string; input: { entity: 'arithmetic' | 'sum' }; name: string; shape: 'matches' }
  | {
      description: string;
      input: { node: SchemaNodeInterface<unknown, unknown>; schema: Record<string, unknown> };
      name: string;
      shape: 'matches-raw';
    }
  | {
      description: string;
      expected: { messageIncludes: string };
      input: { node: SchemaNodeInterface<unknown, unknown>; schema: Record<string, unknown> };
      name: string;
      shape: 'rejects';
    };

const matchingPairs = {
  'arithmetic': { 'node': ArithmeticScenarioCaseEntity.Node, 'schema': ArithmeticScenarioCaseEntity.Schema },
  'sum': { 'node': SumScenarioCaseEntity.Node, 'schema': SumScenarioCaseEntity.Schema }
};

const redundantTypeWithEnumNode = SchemaNode.defineEnum({}, ['aborted', 'active', 'idle'] as const);
const redundantTypeWithEnumSchema = { 'enum': ['aborted', 'active', 'idle'], 'type': 'string' } as const;

const mixedTypeEnumNode = SchemaNode.defineEnum({}, ['aborted', 1, 'idle'] as const);
const mixedTypeEnumSchema = { 'enum': ['aborted', 1, 'idle'], 'type': 'string' } as const;

const redundantTypeWithConstNode = SchemaNode.defineConst({}, 'idle');
const redundantTypeWithConstSchema = { 'const': 'idle', 'type': 'string' } as const;

const nullableTypeArrayNode = SchemaNode.defineAnyOf({}, [
  SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
  SchemaNode.defineNull({ 'minimum': 0, 'type': 'null' } as const)
]);
const nullableTypeArraySchema = { 'minimum': 0, 'type': ['number', 'null'] } as const;

const emptyPropertiesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} });
const emptyPropertiesSchema = { 'type': 'object' } as const;

const openAdditionalPropertiesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineUnknown({} as const), 'patternProperties': {} });
const openAdditionalPropertiesSchema = { 'type': 'object' } as const;

const annotationDriftNode = SchemaNode.defineEnum({}, [0, 1] as const);
const annotationDriftSchema = { 'description': 'Numeric flag.', 'enum': [0, 1], 'title': 'Flag' } as const;

const genuineTypeMismatchNode = SchemaNode.defineEnum({}, ['aborted', 'active', 'idle'] as const);
const genuineTypeMismatchSchema = { 'enum': ['aborted', 'active', 'idle'], 'type': 'number' } as const;

const genuineClosedObjectNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
const genuineOpenObjectSchema = { 'type': 'object' } as const;

const scenarioCases: readonly ScenarioCase[] = [
  {
    'description': 'a flat entity whose Schema and Node were authored in lockstep matches',
    'input': { 'entity': 'sum' },
    'name': 'sum-entity-matches',
    'shape': 'matches'
  },
  {
    'description': 'a oneOf entity whose Schema and Node were authored in lockstep matches',
    'input': { 'entity': 'arithmetic' },
    'name': 'arithmetic-entity-matches',
    'shape': 'matches'
  },
  {
    'description': 'a Schema missing a property Node declares rejects, naming both sides',
    'expected': { 'messageIncludes': 'Schema and Node disagree' },
    'input': {
      'node': AddScenarioCaseEntity.Node,
      'schema': {
        'additionalProperties': false,
        'properties': { 'description': AddScenarioCaseEntity.Schema.properties.description },
        'required': ['description'],
        'type': 'object'
      }
    },
    'name': 'missing-property-rejects',
    'shape': 'rejects'
  },
  {
    'description': 'a Schema whose required list omits an entry Node requires rejects',
    'expected': { 'messageIncludes': 'Schema and Node disagree' },
    'input': {
      'node': AddScenarioCaseEntity.Node,
      'schema': {
        ...AddScenarioCaseEntity.Schema,
        'required': ['description', 'expected', 'input', 'name']
      }
    },
    'name': 'shorter-required-list-rejects',
    'shape': 'rejects'
  },
  {
    'description': 'a correctly-authored pattern-properties pair rejects, since patternProperties is outside this check\'s scope',
    'expected': { 'messageIncludes': 'Schema and Node disagree' },
    'input': { 'node': patternPropertiesNode, 'schema': patternPropertiesSchema },
    'name': 'out-of-scope-keyword-rejects',
    'shape': 'rejects'
  },
  {
    'description': 'a `type` sibling fully implied by every `enum` member\'s JSON type matches',
    'input': { 'node': redundantTypeWithEnumNode, 'schema': redundantTypeWithEnumSchema },
    'name': 'redundant-type-with-enum-matches',
    'shape': 'matches-raw'
  },
  {
    'description': 'a `type` sibling fully implied by `const`\'s JSON type matches',
    'input': { 'node': redundantTypeWithConstNode, 'schema': redundantTypeWithConstSchema },
    'name': 'redundant-type-with-const-matches',
    'shape': 'matches-raw'
  },
  {
    'description': 'a nullable `type: [T, \'null\']` schema matches its equivalent `anyOf` Node',
    'input': { 'node': nullableTypeArrayNode, 'schema': nullableTypeArraySchema },
    'name': 'nullable-type-array-matches',
    'shape': 'matches-raw'
  },
  {
    'description': 'an empty `properties: {}` and an absent `properties` key match',
    'input': { 'node': emptyPropertiesNode, 'schema': emptyPropertiesSchema },
    'name': 'empty-properties-matches',
    'shape': 'matches-raw'
  },
  {
    'description': 'an explicit `additionalProperties: true`/`{}` and an absent `additionalProperties` key match',
    'input': { 'node': openAdditionalPropertiesNode, 'schema': openAdditionalPropertiesSchema },
    'name': 'open-additional-properties-matches',
    'shape': 'matches-raw'
  },
  {
    'description': 'differing annotation-only keywords (`description`, `title`) never block a match',
    'input': { 'node': annotationDriftNode, 'schema': annotationDriftSchema },
    'name': 'annotation-drift-matches',
    'shape': 'matches-raw'
  },
  {
    'description': 'a mixed-type `enum` keeps its `type` sibling — dropping it would accept an instance the enum itself already narrows',
    'expected': { 'messageIncludes': 'Schema and Node disagree' },
    'input': { 'node': mixedTypeEnumNode, 'schema': mixedTypeEnumSchema },
    'name': 'mixed-type-enum-rejects',
    'shape': 'rejects'
  },
  {
    'description': 'a `type` genuinely inconsistent with its `enum` members still rejects',
    'expected': { 'messageIncludes': 'Schema and Node disagree' },
    'input': { 'node': genuineTypeMismatchNode, 'schema': genuineTypeMismatchSchema },
    'name': 'genuine-type-mismatch-rejects',
    'shape': 'rejects'
  },
  {
    'description': 'a Node that forbids additional properties against a Schema that allows them still rejects',
    'expected': { 'messageIncludes': 'Schema and Node disagree' },
    'input': { 'node': genuineClosedObjectNode, 'schema': genuineOpenObjectSchema },
    'name': 'genuine-additional-properties-mismatch-rejects',
    'shape': 'rejects'
  }
];

const scenarioRunners: { [K in ScenarioCase['shape']]: (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void } = {
  'matches': (scenarioCase) => {
    const pair = matchingPairs[scenarioCase.input.entity];
    NodeSchemaAgreement.assertMatches(pair.schema, pair.node);
  },
  'matches-raw': (scenarioCase) => {
    NodeSchemaAgreement.assertMatches(scenarioCase.input.schema, scenarioCase.input.node);
  },
  'rejects': (scenarioCase) => {
    assert.throws(
      () => NodeSchemaAgreement.assertMatches(scenarioCase.input.schema, scenarioCase.input.node),
      (error: unknown) => {
        assert.ok(error instanceof RuntimeError);
        assert.ok(error.message.includes(scenarioCase.expected.messageIncludes), error.message);
        return true;
      }
    );
  }
};

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): void {
  scenarioRunners[scenarioCase.shape](scenarioCase);
}

void describe('NodeSchemaAgreement', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
