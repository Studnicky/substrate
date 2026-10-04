import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { VectorEntryInterface, VectorIndexInterface, VectorizerInterface } from '../../../src/semantic/node/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import {
  AdjudicationEntity,
  AdjudicationInputEntity,
  ClassificationEntity,
  ClassificationInputEntity,
  RerankInputEntity,
  RerankMatchEntity,
  VectorEntryDataEntity,
  VectorizationInputEntity,
  VectorMatchEntity,
  VectorSearchOptionsEntity
} from '../../../src/semantic/entities/index.js';
import { SemanticMatchingScenarioCaseEntity } from './entities/SemanticMatchingScenarioCaseEntity.js';
import scenarioGroups from './SemanticMatching.scenarios.json' with { 'type': 'json' };

class StaticVectorizer implements VectorizerInterface {
  public embed(_input: VectorizationInputEntity.Type): Promise<Float32Array> {
    const vector = Promise.resolve(Float32Array.of(1, 0));
    return vector;
  }

  public getModelIdentity(): string {
    const identity = 'test-vectorizer';
    return identity;
  }

  public getVectorDimension(): number {
    const dimension = 2;
    return dimension;
  }
}

class SingleEntryVectorIndex implements VectorIndexInterface {
  #entry: VectorEntryInterface | undefined;

  public delete(id: string, namespace: string): Promise<void> {
    if (this.#entry?.id === id && this.#entry.namespace === namespace) { this.#entry = undefined; }
    const settled = Promise.resolve();
    return settled;
  }

  public search(_vector: Float32Array, options: VectorSearchOptionsEntity.Type): Promise<readonly VectorMatchEntity.Type[]> {
    const matches: readonly VectorMatchEntity.Type[] = this.#entry !== undefined && this.#entry.namespace === options.namespace && options.limit !== 0
      ? [{ 'id': this.#entry.id, 'score': 1 }]
      : [];
    const settled = Promise.resolve(matches);
    return settled;
  }

  public upsert(entry: VectorEntryInterface): Promise<void> {
    this.#entry = entry;
    const settled = Promise.resolve();
    return settled;
  }
}

class SemanticMatchingRunners {
  static async 'vector-search'(scenarioCase: ScenarioCaseOfType<SemanticMatchingScenarioCaseEntity.Type, 'vector-search'>): Promise<void> {
    const vectorizer = new StaticVectorizer();
    const index = new SingleEntryVectorIndex();
    await index.upsert({ 'id': scenarioCase.input.id, 'namespace': scenarioCase.input.namespace, 'vector': await vectorizer.embed({ 'content': scenarioCase.input.content }) });
    const matches = await index.search(await vectorizer.embed({ 'content': scenarioCase.input.content }), { 'limit': 1, 'namespace': scenarioCase.input.namespace });
    assert.equal(vectorizer.getModelIdentity(), scenarioCase.expected.modelIdentity);
    assert.equal(matches.at(0)?.id, scenarioCase.expected.resultId);
  }
}

ScenarioSuite.register({
  'entity': SemanticMatchingScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'semantic matching contracts',
  'runners': SemanticMatchingRunners
});

void describe('semantic-matching entity contracts', () => {
  void it('rejects undeclared properties and preserves every declared JSON model', () => {
    assert.deepEqual(AdjudicationEntity.intake({ 'confidence': 0.9, 'id': 'candidate-a' }), { 'confidence': 0.9, 'id': 'candidate-a' });
    assert.deepEqual(AdjudicationInputEntity.intake({ 'candidateIds': ['candidate-a'], 'content': 'query', 'maximumCandidates': 3 }), { 'candidateIds': ['candidate-a'], 'content': 'query', 'maximumCandidates': 3 });
    assert.deepEqual(ClassificationEntity.intake({ 'confidence': 0.9, 'label': 'help' }), { 'confidence': 0.9, 'label': 'help' });
    assert.deepEqual(ClassificationInputEntity.intake({ 'content': 'query', 'labels': ['help'] }), { 'content': 'query', 'labels': ['help'] });
    assert.deepEqual(RerankInputEntity.intake({ 'candidateIds': ['candidate-a'], 'content': 'query' }), { 'candidateIds': ['candidate-a'], 'content': 'query' });
    assert.deepEqual(RerankMatchEntity.intake({ 'id': 'candidate-a', 'score': 0.9 }), { 'id': 'candidate-a', 'score': 0.9 });
    assert.deepEqual(VectorMatchEntity.intake({ 'id': 'candidate-a', 'score': 0.9 }), { 'id': 'candidate-a', 'score': 0.9 });
    assert.deepEqual(VectorSearchOptionsEntity.intake({ 'limit': 3, 'namespace': 'help' }), { 'limit': 3, 'namespace': 'help' });
    assert.deepEqual(VectorizationInputEntity.intake({ 'content': 'query', 'metadata': { 'source': 'test' } }), { 'content': 'query', 'metadata': { 'source': 'test' } });
    assert.deepEqual(VectorEntryDataEntity.create({ 'id': 'candidate-a', 'namespace': 'help' }), { 'id': 'candidate-a', 'namespace': 'help' });

    assert.equal(AdjudicationEntity.validate({ 'confidence': 0.9 }), true);
    assert.equal(VectorSearchOptionsEntity.validate({ 'limit': 3, 'namespace': 'help' }), true);
    assert.throws(() => { AdjudicationEntity.intake({ 'confidence': 0.9, 'unexpected': true }); });
    assert.throws(() => { AdjudicationInputEntity.intake({ 'candidateIds': ['candidate-a'], 'content': 'query', 'maximumCandidates': 3, 'unexpected': true }); });
    assert.throws(() => { ClassificationEntity.intake({ 'confidence': 0.9, 'label': 'help', 'unexpected': true }); });
    assert.throws(() => { ClassificationInputEntity.intake({ 'content': 'query', 'unexpected': true }); });
    assert.throws(() => { RerankInputEntity.intake({ 'candidateIds': ['candidate-a'], 'content': 'query', 'unexpected': true }); });
    assert.throws(() => { RerankMatchEntity.intake({ 'id': 'candidate-a', 'score': 0.9, 'unexpected': true }); });
    assert.throws(() => { VectorMatchEntity.intake({ 'id': 'candidate-a', 'score': 0.9, 'unexpected': true }); });
    assert.throws(() => { VectorSearchOptionsEntity.intake({ 'limit': 3, 'namespace': 'help', 'unexpected': true }); });
    assert.throws(() => { VectorizationInputEntity.intake({ 'content': 'query', 'unexpected': true }); });
    assert.throws(() => { VectorEntryDataEntity.intake({ 'id': 'candidate-a', 'namespace': 'help', 'vector': Float32Array.of(1) }); });
  });
});
