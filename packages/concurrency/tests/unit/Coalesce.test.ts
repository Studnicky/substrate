import { it } from 'node:test';
import assert from 'node:assert/strict';
import { Coalesce } from '../../src/Coalesce.js';

const coalesceScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'concurrent calls for the same key share one factory invocation',
    exec: async () => {
      const coalesce = Coalesce.create<string>();
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
    },
  },
  {
    description: 'different keys run independent factory calls',
    exec: async () => {
      const coalesce = Coalesce.create<number>();
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
    },
  },
  {
    description: 'isInflight returns true while in-flight, false after resolution',
    exec: async () => {
      const coalesce = Coalesce.create<string>();

      let resolve!: (v: string) => void;
      const factory = (): Promise<string> =>
        new Promise((res) => { resolve = res; });

      const pending = coalesce.run('k', factory);
      assert.equal(coalesce.isInflight('k'), true);

      resolve('done');
      await pending;

      assert.equal(coalesce.isInflight('k'), false);
    },
  },
  {
    description: 'factory error propagates and entry is cleaned up',
    exec: async () => {
      const coalesce = Coalesce.create<string>();

      await assert.rejects(
        () => coalesce.run('k', () => Promise.reject(new Error('factory-error'))),
        /factory-error/
      );

      assert.equal(coalesce.isInflight('k'), false);
    },
  },
  {
    description: 'sequential calls after resolution each trigger a new factory call',
    exec: async () => {
      const coalesce = Coalesce.create<number>();
      let calls = 0;
      const factory = (): Promise<number> => Promise.resolve(++calls);

      await coalesce.run('k', factory);
      await coalesce.run('k', factory);

      assert.equal(calls, 2);
    },
  },
];
for (const { description, exec } of coalesceScenarios) {
  it(description, exec);
}

// Hook observation tests
class ObservedCoalesce<T> extends Coalesce<T> {
  readonly startEvents: string[] = [];
  readonly joinEvents: string[] = [];
  readonly settledEvents: { 'key': string; 'success': boolean }[] = [];

  protected override onCoalesceStart(key: string): void {
    this.startEvents.push(key);
  }
  protected override onCoalesceJoin(key: string): void {
    this.joinEvents.push(key);
  }
  protected override onCoalesceSettled(key: string, success: boolean): void {
    this.settledEvents.push({ 'key': key, 'success': success });
  }
}

it('onCoalesceStart fires once for leader, onCoalesceJoin fires for each joiner', async () => {
  const c = new ObservedCoalesce<string>();
  const factory = (): Promise<string> => new Promise((resolve) => setTimeout(() => resolve('v'), 10));

  await Promise.all([
    c.run('k', factory),
    c.run('k', factory),
    c.run('k', factory),
  ]);

  assert.deepEqual(c.startEvents, ['k']);
  assert.deepEqual(c.joinEvents, ['k', 'k']);
});

it('onCoalesceSettled fires with success=true on resolution', async () => {
  const c = new ObservedCoalesce<number>();
  await c.run('k', () => Promise.resolve(42));
  assert.equal(c.settledEvents.length, 1);
  assert.deepEqual(c.settledEvents[0], { 'key': 'k', 'success': true });
});

it('onCoalesceSettled fires with success=false on rejection', async () => {
  const c = new ObservedCoalesce<number>();
  await assert.rejects(() => c.run('k', () => Promise.reject(new Error('fail'))), /fail/);
  assert.equal(c.settledEvents.length, 1);
  assert.deepEqual(c.settledEvents[0], { 'key': 'k', 'success': false });
});
