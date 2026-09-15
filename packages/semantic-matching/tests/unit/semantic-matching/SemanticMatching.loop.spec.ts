import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types/node';

import {
  AdjudicationEntity,
  AdjudicationInputEntity,
  ClassificationEntity,
  ClassificationInputEntity,
  RerankInputEntity,
  RerankMatchEntity,
  VectorEntryDataEntity,
  VectorMatchEntity,
  VectorizationInputEntity,
  VectorSearchOptionsEntity
} from "../../../src/entities/index.js";
import type { VectorEntryInterface, VectorIndexInterface, VectorizerInterface } from "../../../src/index.js";
import scenarioGroups from './SemanticMatching.scenarios.json' with { type: 'json' };

interface ScenarioCase {
  readonly 'expected': { readonly 'modelIdentity': string; readonly 'resultId': string };
  readonly 'input': { readonly 'content': string; readonly 'id': string; readonly 'namespace': string };
  readonly 'name': string;
  readonly 'shape': 'vector-search';
}

class StaticVectorizer implements VectorizerInterface {
  public embed(_input: VectorizationInputEntity.Type): Promise<Float32Array> { return Promise.resolve(Float32Array.of(1, 0)); }
  public getModelIdentity(): string { return 'test-vectorizer'; }
  public getVectorDimension(): number { return 2; }
}

class SingleEntryVectorIndex implements VectorIndexInterface {
  #entry: VectorEntryInterface | undefined;

  public delete(id: string, namespace: string): Promise<void> {
    if (this.#entry?.id === id && this.#entry.namespace === namespace) { this.#entry = undefined; }
    return Promise.resolve();
  }

  public search(_vector: Float32Array, options: VectorSearchOptionsEntity.Type): Promise<readonly VectorMatchEntity.Type[]> {
    if (this.#entry === undefined || this.#entry.namespace !== options.namespace || options.limit === 0) { return Promise.resolve([]); }
    return Promise.resolve([{ 'id': this.#entry.id, 'score': 1 }]);
  }

  public upsert(entry: VectorEntryInterface): Promise<void> { this.#entry = entry; return Promise.resolve(); }
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (!Predicates.isObject(value)) { throw RuntimeError.create(`${name} must be an object`); }
  return value;
}

function requireString(value: unknown, name: string): string {
  if (!Predicates.isString(value)) { throw RuntimeError.create(`${name} must be a string`); }
  return value;
}

function parseScenarioCase(value: unknown): ScenarioCase {
  const record = requireRecord(value, 'scenario case');
  const expected = requireRecord(record['expected'], 'scenario expected');
  const input = requireRecord(record['input'], 'scenario input');
  const shape = requireString(record['shape'], 'scenario shape');
  if (shape !== 'vector-search') { throw RuntimeError.create(`Unknown semantic matching scenario shape: ${shape}`); }
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
  if (!Predicates.isArray(cases)) { throw RuntimeError.create('scenario groups cases must be an array'); }
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


void describe("semantic-matching entity contracts", () => {
  void it("rejects undeclared properties and preserves every declared JSON model", () => {
    assert.deepEqual(AdjudicationEntity.intake({ "confidence": 0.9, "id": "candidate-a" }), { "confidence": 0.9, "id": "candidate-a" });
    assert.deepEqual(AdjudicationInputEntity.intake({ "candidateIds": ["candidate-a"], "content": "query", "maximumCandidates": 3 }), { "candidateIds": ["candidate-a"], "content": "query", "maximumCandidates": 3 });
    assert.deepEqual(ClassificationEntity.intake({ "confidence": 0.9, "label": "help" }), { "confidence": 0.9, "label": "help" });
    assert.deepEqual(ClassificationInputEntity.intake({ "content": "query", "labels": ["help"] }), { "content": "query", "labels": ["help"] });
    assert.deepEqual(RerankInputEntity.intake({ "candidateIds": ["candidate-a"], "content": "query" }), { "candidateIds": ["candidate-a"], "content": "query" });
    assert.deepEqual(RerankMatchEntity.intake({ "id": "candidate-a", "score": 0.9 }), { "id": "candidate-a", "score": 0.9 });
    assert.deepEqual(VectorMatchEntity.intake({ "id": "candidate-a", "score": 0.9 }), { "id": "candidate-a", "score": 0.9 });
    assert.deepEqual(VectorSearchOptionsEntity.intake({ "limit": 3, "namespace": "help" }), { "limit": 3, "namespace": "help" });
    assert.deepEqual(VectorizationInputEntity.intake({ "content": "query", "metadata": { "source": "test" } }), { "content": "query", "metadata": { "source": "test" } });
    assert.deepEqual(VectorEntryDataEntity.create({ "id": "candidate-a", "namespace": "help" }), { "id": "candidate-a", "namespace": "help" });

    assert.equal(AdjudicationEntity.validate({ "confidence": 0.9 }), true);
    assert.equal(VectorSearchOptionsEntity.validate({ "limit": 3, "namespace": "help" }), true);
    assert.throws(() => AdjudicationEntity.intake({ "confidence": 0.9, "unexpected": true }));
    assert.throws(() => AdjudicationInputEntity.intake({ "candidateIds": ["candidate-a"], "content": "query", "maximumCandidates": 3, "unexpected": true }));
    assert.throws(() => ClassificationEntity.intake({ "confidence": 0.9, "label": "help", "unexpected": true }));
    assert.throws(() => ClassificationInputEntity.intake({ "content": "query", "unexpected": true }));
    assert.throws(() => RerankInputEntity.intake({ "candidateIds": ["candidate-a"], "content": "query", "unexpected": true }));
    assert.throws(() => RerankMatchEntity.intake({ "id": "candidate-a", "score": 0.9, "unexpected": true }));
    assert.throws(() => VectorMatchEntity.intake({ "id": "candidate-a", "score": 0.9, "unexpected": true }));
    assert.throws(() => VectorSearchOptionsEntity.intake({ "limit": 3, "namespace": "help", "unexpected": true }));
    assert.throws(() => VectorizationInputEntity.intake({ "content": "query", "unexpected": true }));
    assert.throws(() => VectorEntryDataEntity.intake({ "id": "candidate-a", "namespace": "help", "vector": Float32Array.of(1) }));
  });
});
