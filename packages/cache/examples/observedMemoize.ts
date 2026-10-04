import assert from 'node:assert/strict';

import { Memoize } from '../src/memoize/index.js';

class ObservedMemoize extends Memoize<[string], { readonly 'id': string }> {
  readonly events: string[] = [];

  protected override onMemoCoalesced(key: string): void {
    this.events.push(`coalesced:${key}`);
  }

  protected override onMemoHit(key: string): void {
    this.events.push(`hit:${key}`);
  }

  protected override onMemoMiss(key: string): void {
    this.events.push(`miss:${key}`);
  }
}

class ObservedMemoizeExample {
  static async run(): Promise<void> {
    let fetchCalls = 0;
    const memo = ObservedMemoize.create(
      (id: string): { readonly 'id': string } => {
        fetchCalls += 1;
        return { 'id': `record:${id}` };
      },
      { 'capacity': 10, 'ttlMs': 60_000 },
      { 'keyDeriver': (id: string): string => {return id;} }
    );

    // #region usage
    const first = await memo.call('order-42');
    const second = await memo.call('order-42');
    memo.invalidate('order-42');
    const third = await memo.call('order-42');
    // #endregion usage

    assert.deepEqual(first, { 'id': 'record:order-42' });
    assert.deepEqual(second, { 'id': 'record:order-42' });
    assert.deepEqual(third, { 'id': 'record:order-42' });
    assert.equal(fetchCalls, 2);
    assert.deepEqual(memo.events, ['miss:order-42', 'hit:order-42', 'miss:order-42']);

    console.log('observedMemoize: all assertions passed');
  }
}

await ObservedMemoizeExample.run();
