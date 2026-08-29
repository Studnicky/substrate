import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import { DrilldownUtilities } from '../../src/modules/DrilldownUtilities.js';
import scenarioCases from './DrilldownUtilities.scenarios.json' with { type: 'json' };

// `expected.value` is JSON, so an absent result is spelled `null` in the corpus and
// compared against `undefined` here — JSON has no undefined.
type ScenarioCase = {
  description: string;
  expected: { value: string | null };
  input: { path: string; source: Record<string, unknown> };
  name: string;
  shape: 'property-value';
};

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  assert.ok(Predicates.isRecord(value), `${path} must be an object`);
  return value;
}

function requireString(value: unknown, path: string): string {
  assert.ok(Predicates.isString(value), `${path} must be a string`);
  return value;
}

function parseExpectedValue(value: unknown, path: string): string | null {
  if (value === null) {
    return value;
  }

  return requireString(value, path);
}

function parseScenarioCase(value: unknown, index: number): ScenarioCase {
  const path = `scenario[${index}]`;
  const scenario = requireRecord(value, path);
  const input = requireRecord(scenario.input, `${path}.input`);
  const expected = requireRecord(scenario.expected, `${path}.expected`);

  assert.equal(scenario.shape, 'property-value', `${path}.shape is not supported`);

  return {
    'description': requireString(scenario.description, `${path}.description`),
    'expected': { 'value': parseExpectedValue(expected.value, `${path}.expected.value`) },
    'input': {
      'path': requireString(input.path, `${path}.input.path`),
      'source': requireRecord(input.source, `${path}.input.source`)
    },
    'name': requireString(scenario.name, `${path}.name`),
    'shape': scenario.shape
  };
}

function parseScenarioCases(value: unknown): ScenarioCase[] {
  assert.ok(Predicates.isArray(value), 'scenario fixture must be an array');
  return value.map(parseScenarioCase);
}

function runScenarioCase(scenarioCase: ScenarioCase): void {
  const actual = DrilldownUtilities.getPropertyValue(scenarioCase.input.source, scenarioCase.input.path);
  const expected = scenarioCase.expected.value ?? undefined;

  assert.equal(actual, expected);
}

void describe('DrilldownUtilities', () => {
  for (const scenarioCase of parseScenarioCases(scenarioCases)) {
    void it(`${scenarioCase.name}: ${scenarioCase.description}`, () => {
      runScenarioCase(scenarioCase);
    });
  }
});
