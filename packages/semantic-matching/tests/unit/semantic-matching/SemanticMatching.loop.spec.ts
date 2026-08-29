import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import type { VectorEntryInterface, VectorIndexInterface, VectorSearchOptionsInterface, VectorizerInterface, VectorizationInputInterface } from '../../../src/index.js';
import scenarioGroups from './SemanticMatching.scenarios.json' with { type: 'json' };

interface ScenarioCase {
  readonly 'expected': { readonly 'modelIdentity': string; readonly 'resultId': string };
  readonly 'input': { readonly 'content': string; readonly 'id': string; readonly 'namespace': string };
  readonly 'name': string;
  readonly 'shape': 'vector-search';
}

class StaticVectorizer implements VectorizerInterface {
  public embed(_input: VectorizationInputInterface): Promise<Float32Array> { return Promise.resolve(Float32Array.of(1, 0)); }
  public getModelIdentity(): string { return 'test-vectorizer'; }
  public getVectorDimension(): number { return 2; }
}

class SingleEntryVectorIndex implements VectorIndexInterface {
  #entry: VectorEntryInterface | undefined;

  public delete(id: string, namespace: string): Promise<void> {
    if (this.#entry?.id === id && this.#entry.namespace === namespace) { this.#entry = undefined; }
    return Promise.resolve();
  }

  public search(_vector: Float32Array, options: VectorSearchOptionsInterface): Promise<readonly { readonly 'id': string; readonly 'score': number }[]> {
    if (this.#entry === undefined || this.#entry.namespace !== options.namespace || options.limit === 0) { return Promise.resolve([]); }
    return Promise.resolve([{ 'id': this.#entry.id, 'score': 1 }]);
  }

  public upsert(entry: VectorEntryInterface): Promise<void> { this.#entry = entry; return Promise.resolve(); }
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
  if (shape !== 'vector-search') { throw new TypeError(`Unknown semantic matching scenario shape: ${shape}`); }
  return {
    'expected': { 'modelIdentity': requireString(expected['modelIdentity'], 'scenario expected modelIdentity'), 'resultId': requireString(expected['resultId'], 'scenario expected resultId') },
    'input': { 'content': requireString(input['content'], 'scenario input content'), 'id': requireString(input['id'], 'scenario input id'), 'namespace': requireString(input['namespace'], 'scenario input namespace') },
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

void describe('semantic matching contracts', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, async () => {
      const vectorizer = new StaticVectorizer();
      const index = new SingleEntryVectorIndex();
      await index.upsert({ 'id': scenarioCase.input.id, 'namespace': scenarioCase.input.namespace, 'vector': await vectorizer.embed({ 'content': scenarioCase.input.content }) });
      const matches = await index.search(await vectorizer.embed({ 'content': scenarioCase.input.content }), { 'limit': 1, 'namespace': scenarioCase.input.namespace });
      assert.equal(vectorizer.getModelIdentity(), scenarioCase.expected.modelIdentity);
      assert.equal(matches.at(0)?.id, scenarioCase.expected.resultId);
    });
  }
});
