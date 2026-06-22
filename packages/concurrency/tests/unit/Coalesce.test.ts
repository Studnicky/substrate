import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Coalesce } from '../../src/Coalesce.js';

describe('Coalesce', () => {
  it('concurrent calls for the same key share one factory invocation', async () => {
    const coalesce = new Coalesce<string>();
    let calls = 0;

    const factory = (): Promise<string> => {
      calls += 1;
      return new Promise((resolve) => setTimeout(() => resolve('result'), 10));
    };

    const [a, b, c] = await Promise.all([
      coalesce.run('key', factory),
      coalesce.run('key', factory),
      coalesce.run('key', factory),
    ]);

    assert.equal(calls, 1);
    assert.equal(a, 'result');
    assert.equal(b, 'result');
    assert.equal(c, 'result');
  });

  it('different keys run independent factory calls', async () => {
    const coalesce = new Coalesce<number>();
    let calls = 0;

    const factory = (n: number) => (): Promise<number> => {
      calls += 1;
      return Promise.resolve(n);
    };

    const [a, b] = await Promise.all([
      coalesce.run('key-a', factory(1)),
      coalesce.run('key-b', factory(2)),
    ]);

    assert.equal(calls, 2);
    assert.equal(a, 1);
    assert.equal(b, 2);
  });

  it('isInflight returns true while in-flight, false after resolution', async () => {
    const coalesce = new Coalesce<string>();

    let resolve!: (v: string) => void;
    const factory = (): Promise<string> =>
      new Promise((res) => { resolve = res; });

    const pending = coalesce.run('k', factory);
    assert.equal(coalesce.isInflight('k'), true);

    resolve('done');
    await pending;

    assert.equal(coalesce.isInflight('k'), false);
  });

  it('factory error propagates and entry is cleaned up', async () => {
    const coalesce = new Coalesce<string>();

    await assert.rejects(
      () => coalesce.run('k', () => Promise.reject(new Error('factory-error'))),
      /factory-error/
    );

    assert.equal(coalesce.isInflight('k'), false);
  });

  it('sequential calls after resolution each trigger a new factory call', async () => {
    const coalesce = new Coalesce<number>();
    let calls = 0;
    const factory = (): Promise<number> => Promise.resolve(++calls);

    await coalesce.run('k', factory);
    await coalesce.run('k', factory);

    assert.equal(calls, 2);
  });
});
