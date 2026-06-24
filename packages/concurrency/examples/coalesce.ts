/** coalesce — demonstrates Coalesce deduplication of concurrent calls for the same key. Run: npx tsx examples/coalesce.ts */

import assert from 'node:assert/strict';

// #region usage
import { Coalesce } from '../src/index.js';

class CoalesceDemo {
  static async runSharedInFlight(): Promise<{ 'a': string; 'b': string; 'callCount': number }> {
    const coalesce = new Coalesce<string>();
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
    return { 'a': a, 'b': b, 'callCount': callCount };
  }

  static async runIsInflight(): Promise<number> {
    const coalesce = new Coalesce<number>();

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
    return result;
  }

  static async runDistinctKeys(): Promise<{ 'a': string; 'b': string; 'callCounts': Record<string, number> }> {
    const coalesce = new Coalesce<string>();
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
    return { 'a': a, 'b': b, 'callCounts': callCounts };
  }

  static async runSequentialCallsEachInvokeFactory(): Promise<{ 'callCount': number; 'first': number; 'second': number }> {
    const coalesce = new Coalesce<number>();
    let callCount = 0;

    const factory = (): Promise<number> => {
      callCount += 1;
      return Promise.resolve(callCount);
    };

    // Sequential calls — no in-flight overlap — each invokes factory
    const first = await coalesce.run('seq', factory);
    const second = await coalesce.run('seq', factory);

    console.log('Sequential — first:', first, 'second:', second, 'callCount:', callCount);
    return { 'callCount': callCount, 'first': first, 'second': second };
  }
}
// #endregion usage

const sharedResult = await CoalesceDemo.runSharedInFlight();
assert.equal(sharedResult.a, 'data');
assert.equal(sharedResult.b, 'data');
assert.equal(sharedResult.callCount, 1);

const inflightResult = await CoalesceDemo.runIsInflight();
assert.equal(inflightResult, 42);

const distinctResult = await CoalesceDemo.runDistinctKeys();
assert.equal(distinctResult.a, 'result-a');
assert.equal(distinctResult.b, 'result-b');
assert.equal(distinctResult.callCounts.a, 1);
assert.equal(distinctResult.callCounts.b, 1);

const seqResult = await CoalesceDemo.runSequentialCallsEachInvokeFactory();
assert.equal(seqResult.first, 1);
assert.equal(seqResult.second, 2);
assert.equal(seqResult.callCount, 2);

console.log('coalesce: all assertions passed');
