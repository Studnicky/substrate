/** coalesce — demonstrates Coalesce deduplication of concurrent calls for the same key. Run: npx tsx examples/coalesce.ts */

import assert from 'node:assert/strict';

// #region usage
import { Coalesce } from '../src/index.js';

class CoalesceDemo {
  static async runSharedInFlight(): Promise<void> {
    const coalesce = Coalesce.create<string>();
    let callCount = 0;

    const factory = (): Promise<string> => {
      callCount += 1;
      return new Promise<string>((resolve) => {
        setImmediate(() => { resolve('data'); });
      });
    };

    // Both calls start before factory resolves — they share one in-flight promise
    const [a, b] = await Promise.all([
      coalesce.run('key', factory),
      coalesce.run('key', factory)
    ]);

    console.log('Coalesce shared result a:', a, 'b:', b, 'callCount:', callCount);
    assert.equal(a, 'data');
    assert.equal(b, 'data');
    assert.equal(callCount, 1);
  }

  static async runIsInflight(): Promise<void> {
    const coalesce = Coalesce.create<number>();

    let resolve!: (v: number) => void;
    const factory = (): Promise<number> =>
    {return new Promise<number>((res) => { resolve = res; });};

    // Not in-flight before we start
    const beforeStart = coalesce.isInflight('item');
    const promise = coalesce.run('item', factory);

    // In-flight while factory is pending
    const duringInflight = coalesce.isInflight('item');

    resolve(42);
    const result = await promise;

    // No longer in-flight once resolved
    const afterResolve = coalesce.isInflight('item');
    console.log('isInflight — before:', beforeStart, 'during:', duringInflight, 'after:', afterResolve, 'result:', result);
    assert.equal(result, 42);
  }

  static async runDistinctKeys(): Promise<void> {
    const coalesce = Coalesce.create<string>();
    const callCounts: Record<string, number> = { 'a': 0, 'b': 0 };

    const factory = (key: string) => {return (): Promise<string> => {
      callCounts[key]! += 1;
      return Promise.resolve(`result-${key}`);
    };};

    const [a, b] = await Promise.all([
      coalesce.run('a', factory('a')),
      coalesce.run('b', factory('b'))
    ]);

    console.log('Distinct keys — a:', a, 'b:', b, 'callCounts:', callCounts);
    assert.equal(a, 'result-a');
    assert.equal(b, 'result-b');
    assert.equal(callCounts.a, 1);
    assert.equal(callCounts.b, 1);
  }

  static async runSequentialCallsEachInvokeFactory(): Promise<void> {
    const coalesce = Coalesce.create<number>();
    let callCount = 0;

    const factory = (): Promise<number> => {
      callCount += 1;
      return Promise.resolve(callCount);
    };

    // Sequential calls — no in-flight overlap — each invokes factory
    const first = await coalesce.run('seq', factory);
    const second = await coalesce.run('seq', factory);

    console.log('Sequential — first:', first, 'second:', second, 'callCount:', callCount);
    assert.equal(first, 1);
    assert.equal(second, 2);
    assert.equal(callCount, 2);
  }
}
// #endregion usage

await CoalesceDemo.runSharedInFlight();
await CoalesceDemo.runIsInflight();
await CoalesceDemo.runDistinctKeys();
await CoalesceDemo.runSequentialCallsEachInvokeFactory();

console.log('coalesce: all assertions passed');
