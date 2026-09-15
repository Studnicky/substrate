/** vectorSearchContract — implement and use the vector contracts locally. Run: npx tsx examples/vectorSearchContract.ts */

import type { VectorizationInputEntity, VectorMatchEntity, VectorSearchOptionsEntity } from '@studnicky/semantic-matching/entities';
import type {
  VectorEntryInterface,
  VectorIndexInterface,
  VectorizerInterface
} from '@studnicky/semantic-matching/node';

import assert from 'node:assert/strict';

class StaticVectorizer implements VectorizerInterface {
  public embed(input: VectorizationInputEntity.Type): Promise<Float32Array> {
    const vector = input.content.includes('refund') ? new Float32Array([1, 0]) : new Float32Array([0, 1]);
    const result = Promise.resolve(vector);
    return result;
  }

  public getModelIdentity(): string {
    return 'demo-static-v1';
  }

  public getVectorDimension(): number {
    return 2;
  }
}

class MemoryVectorIndex implements VectorIndexInterface {
  readonly #entries = new Map<string, VectorEntryInterface>();

  public delete(id: string, namespace: string): Promise<void> {
    this.#entries.delete(`${namespace}:${id}`);
    const result = Promise.resolve();
    return result;
  }

  public search(vector: Float32Array, options: VectorSearchOptionsEntity.Type): Promise<readonly VectorMatchEntity.Type[]> {
    const matches: { 'id': string; 'score': number }[] = [];
    for (const entry of this.#entries.values()) {
      if (entry.namespace !== options.namespace) {
        continue;
      }
      const score = (entry.vector[0] ?? 0) * (vector[0] ?? 0) + (entry.vector[1] ?? 0) * (vector[1] ?? 0);
      matches.push({ 'id': entry.id, 'score': score });
    }
    const sorted = matches.toSorted((left, right): number => { const result = right.score - left.score; return result; });
    const result = Promise.resolve(sorted.slice(0, options.limit));
    return result;
  }

  public upsert(entry: VectorEntryInterface): Promise<void> {
    this.#entries.set(`${entry.namespace}:${entry.id}`, entry);
    const result = Promise.resolve();
    return result;
  }
}

class VectorSearchDemo {
  public static async run(): Promise<void> {
    // #region usage
    const vectorizer = new StaticVectorizer();
    const index = new MemoryVectorIndex();

    await index.upsert({ 'id': 'refund-policy', 'namespace': 'help', 'vector': await vectorizer.embed({ 'content': 'refund policy' }) });
    await index.upsert({ 'id': 'shipping-policy', 'namespace': 'help', 'vector': await vectorizer.embed({ 'content': 'shipping policy' }) });

    const matches = await index.search(await vectorizer.embed({ 'content': 'where is my refund' }), { 'limit': 1, 'namespace': 'help' });
    console.log({ 'matches': matches, 'model': vectorizer.getModelIdentity() });
    // #endregion usage

    assert.deepEqual(matches, [{ 'id': 'refund-policy', 'score': 1 }]);
    console.log('vectorSearchContract: all assertions passed');
  }
}

await VectorSearchDemo.run();
