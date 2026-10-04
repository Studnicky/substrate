import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import { CacheConfigError } from '../../../src/errors/CacheConfigError.js';
import { Memoize } from '../../../src/memoize/index.js';

class ObservedMemoize extends Memoize<[string], string | undefined> {
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

void it('caches successful values including undefined', async () => {
  let calls = 0;
  const memo = Memoize.create(
    (key: string): string | undefined => {
      calls += 1;
      if (key === 'missing') {
        return undefined;
      }
      return `value:${key}`;
    },
    { 'capacity': 2 },
    { 'keyDeriver': (key: string): string => {return key;} }
  );

  assert.equal(await memo.call('missing'), undefined);
  assert.equal(await memo.call('missing'), undefined);
  assert.equal(await memo.call('present'), 'value:present');
  assert.equal(await memo.call('present'), 'value:present');
  assert.equal(calls, 2);
});

void it('coalesces concurrent calls for the same derived key', async () => {
  const completion = Promise.withResolvers<string>();
  let calls = 0;
  const memo = ObservedMemoize.create(
    async (key: string): Promise<string> => {
      calls += 1;
      return `${key}:${await completion.promise}`;
    },
    { 'capacity': 2 },
    { 'keyDeriver': (key: string): string => {return key;} }
  );

  const leader = memo.call('request');
  const follower = memo.call('request');
  completion.resolve('resolved');

  assert.deepEqual(await Promise.all([leader, follower]), ['request:resolved', 'request:resolved']);
  assert.equal(calls, 1);
  assert.deepEqual(memo.events, ['miss:request', 'coalesced:request']);
  assert.equal(await memo.call('request'), 'request:resolved');
  assert.deepEqual(memo.events, ['miss:request', 'coalesced:request', 'hit:request']);
});

void it('does not cache rejected calls', async () => {
  let calls = 0;
  const memo = Memoize.create(
    (key: string): string => {
      calls += 1;
      if (calls === 1) {
        throw RuntimeError.create(`rejected:${key}`);
      }
      return `resolved:${key}`;
    },
    { 'capacity': 2 },
    { 'keyDeriver': (key: string): string => {return key;} }
  );

  await assert.rejects(memo.call('request'), { 'message': 'rejected:request' });
  assert.equal(await memo.call('request'), 'resolved:request');
  assert.equal(await memo.call('request'), 'resolved:request');
  assert.equal(calls, 2);
});

void it('invalidates individual keys and clears every cached value', async () => {
  let calls = 0;
  const memo = Memoize.create(
    (key: string): string => {
      calls += 1;
      return `${key}:${calls}`;
    },
    { 'capacity': 3 },
    { 'keyDeriver': (key: string): string => {return key;} }
  );

  assert.equal(await memo.call('a'), 'a:1');
  assert.equal(await memo.call('b'), 'b:2');
  memo.invalidate('a');
  assert.equal(await memo.call('a'), 'a:3');
  assert.equal(await memo.call('b'), 'b:2');
  memo.clear();
  assert.equal(await memo.call('a'), 'a:4');
  assert.equal(await memo.call('b'), 'b:5');
});

void it('surfaces cache configuration errors from the cache package', () => {
  assert.throws(() => {
    const result = Memoize.create(
      (key: string): string => {return key;},
      { 'capacity': 0 },
      { 'keyDeriver': (key: string): string => {return key;} }
    );
    return result;
  }, CacheConfigError);
});
