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
const patternPropertiesNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {},
  [] as const,
  { 'additionalProperties': false, 'patternProperties': { '^.*$': SchemaNode.defineString({ 'type': 'string' } as const) } }
);
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
      expected: { messageIncludes: string };
      input: { node: SchemaNodeInterface<unknown, unknown>; schema: Record<string, unknown> };
      name: string;
      shape: 'rejects';
    };

const matchingPairs = {
  'arithmetic': { 'node': ArithmeticScenarioCaseEntity.Node, 'schema': ArithmeticScenarioCaseEntity.Schema },
  'sum': { 'node': SumScenarioCaseEntity.Node, 'schema': SumScenarioCaseEntity.Schema }
};

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
  }
];

const scenarioRunners: { [K in ScenarioCase['shape']]: (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void } = {
  'matches': (scenarioCase) => {
    const pair = matchingPairs[scenarioCase.input.entity];
    NodeSchemaAgreement.assertMatches(pair.schema, pair.node);
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
