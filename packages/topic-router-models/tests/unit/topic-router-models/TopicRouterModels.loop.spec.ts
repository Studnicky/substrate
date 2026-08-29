import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ScoreEvidenceInterface } from '@studnicky/matching';
import type { TopicSelectionInterface } from '@studnicky/topic-router';
import { Predicates } from '@studnicky/types';

import type { TopicInferenceInterface, TopicSelectionMapperInterface } from '../../../src/index.js';
import scenarioGroups from './TopicRouterModels.scenarios.json' with { type: 'json' };

interface ScenarioCase {
  readonly 'expected': { readonly 'id': string; readonly 'origin': string; readonly 'score': number };
  readonly 'input': { readonly 'content': string; readonly 'id': string; readonly 'origin': string; readonly 'score': number };
  readonly 'name': string;
  readonly 'shape': 'inference-to-selection';
}

class StaticInference implements TopicInferenceInterface<string> {
  public constructor(private readonly evidence: ScoreEvidenceInterface) {}
  public infer(_input: string): Promise<readonly ScoreEvidenceInterface[]> { return Promise.resolve([this.evidence]); }
}

class EvidenceSelectionMapper implements TopicSelectionMapperInterface {
  public map(evidence: readonly ScoreEvidenceInterface[]): readonly TopicSelectionInterface[] {
    const result: TopicSelectionInterface[] = [];
    for (const item of evidence) { result.push({ 'id': item.id, 'origin': item.origin, 'scores': { [item.origin]: item.score } }); }
    return result;
  }
}

function requireNumber(value: unknown, name: string): number {
  if (!Predicates.isNumber(value)) { throw new TypeError(`${name} must be a number`); }
  return value;
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (!Predicates.isObject(value)) { throw new TypeError(`${name} must be an object`); }
  return value;
}

function requireString(value: unknown, name: string): string {
  if (!Predicates.isString(value)) { throw new TypeError(`${name} must be a string`); }
  return value;
}

function parseScenarioCase(value: unknown): ScenarioCase {
  const record = requireRecord(value, 'scenario case');
  const expected = requireRecord(record['expected'], 'scenario expected');
  const input = requireRecord(record['input'], 'scenario input');
  const shape = requireString(record['shape'], 'scenario shape');
  if (shape !== 'inference-to-selection') { throw new TypeError(`Unknown topic router models scenario shape: ${shape}`); }
  return {
    'expected': { 'id': requireString(expected['id'], 'scenario expected id'), 'origin': requireString(expected['origin'], 'scenario expected origin'), 'score': requireNumber(expected['score'], 'scenario expected score') },
    'input': { 'content': requireString(input['content'], 'scenario input content'), 'id': requireString(input['id'], 'scenario input id'), 'origin': requireString(input['origin'], 'scenario input origin'), 'score': requireNumber(input['score'], 'scenario input score') },
    'name': requireString(record['name'], 'scenario name'),
    'shape': shape
  };
}

function parseScenarioCases(value: unknown): readonly ScenarioCase[] {
  const record = requireRecord(value, 'scenario groups');
  const cases = record['cases'];
  if (!Predicates.isArray(cases)) { throw new TypeError('scenario groups cases must be an array'); }
  const result: ScenarioCase[] = [];
  for (const scenarioCase of cases) { result.push(parseScenarioCase(scenarioCase)); }
  return result;
}

const scenarioCases = parseScenarioCases(scenarioGroups);

void describe('topic router model contracts', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, async () => {
      const inference = new StaticInference({ 'id': scenarioCase.input.id, 'origin': scenarioCase.input.origin, 'score': scenarioCase.input.score });
      const selections = new EvidenceSelectionMapper().map(await inference.infer(scenarioCase.input.content));
      assert.equal(selections.at(0)?.id, scenarioCase.expected.id);
      assert.equal(selections.at(0)?.origin, scenarioCase.expected.origin);
      assert.equal(selections.at(0)?.scores?.[scenarioCase.expected.origin], scenarioCase.expected.score);
    });
  }
});
