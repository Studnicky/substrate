import { it } from 'node:test';
import assert from 'node:assert/strict';
import { Coalesce } from '../../src/Coalesce.js';
import { CoalesceTimeoutError } from '../../src/errors/CoalesceTimeoutError.js';

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

// timeout / onTimeout
class ObservedTimeoutCoalesce<T> extends Coalesce<T> {
  readonly timeoutEvents: { 'key': string; 'timeoutMs': number }[] = [];

  protected override onTimeout(key: string, timeoutMs: number): void {
    this.timeoutEvents.push({ 'key': key, 'timeoutMs': timeoutMs });
  }
}

it('no timeout configured: run() waits indefinitely, behaves exactly as before', async () => {
  const c = Coalesce.create<string>();
  const factory = (): Promise<string> =>
    new Promise((resolve) => { setTimeout(() => resolve('slow-result'), 50); });

  const result = await c.run('k', factory);
  assert.equal(result, 'slow-result');
});

it('timeout configured on a slow factory rejects the timed-out caller with CoalesceTimeoutError and fires onTimeout', async () => {
  const c = new ObservedTimeoutCoalesce<string>({ 'timeout': 20 });

  let resolveFactory!: (v: string) => void;
  const factory = (): Promise<string> =>
    new Promise((resolve) => { resolveFactory = resolve; });

  const pending = c.run('k', factory);

  await assert.rejects(pending, (err: unknown) => {
    assert.ok(err instanceof CoalesceTimeoutError);
    assert.equal(err.key, 'k');
    assert.equal(err.timeoutMs, 20);
    return true;
  });

  assert.deepEqual(c.timeoutEvents, [{ 'key': 'k', 'timeoutMs': 20 }]);

  // the underlying factory is still legitimately running; entry not evicted by the timeout
  assert.equal(c.isInflight('k'), true);

  resolveFactory('eventual-result');
  await new Promise((resolve) => { setTimeout(resolve, 5); });
  assert.equal(c.isInflight('k'), false);
});

it('a second caller joining after the first times out still receives the real result once the factory settles, proving the shared in-flight promise was undisturbed', async () => {
  const c = new ObservedTimeoutCoalesce<string>({ 'timeout': 20 });

  let resolveFactory!: (v: string) => void;
  const factory = (): Promise<string> =>
    new Promise((resolve) => { resolveFactory = resolve; });

  const firstCaller = c.run('k', factory);

  // first caller's own 20ms deadline elapses; the shared in-flight entry is untouched
  await assert.rejects(firstCaller, CoalesceTimeoutError);
  assert.equal(c.isInflight('k'), true);

  // second caller joins the still-pending in-flight promise, starting its own 20ms deadline
  const secondCaller = c.run('k', factory);

  // factory settles well within the second caller's fresh deadline
  resolveFactory('shared-result');

  const secondResult = await secondCaller;
  assert.equal(secondResult, 'shared-result');
  assert.equal(c.timeoutEvents.length, 1);
});

it('a throwing onCoalesceStart hook does not replace the leader result or clear the in-flight entry early', async () => {
  class ThrowingStartCoalesce<T> extends Coalesce<T> {
    protected override onCoalesceStart(): void {
      throw new Error('hook boom');
    }
  }

  const c = new ThrowingStartCoalesce<string>();
  let calls = 0;
  const factory = async (): Promise<string> => {
    calls += 1;
    return 'ok';
  };

  const result = await c.run('k', factory);
  assert.equal(result, 'ok');
  assert.equal(calls, 1);
  assert.equal(c.isInflight('k'), false);
});

it('a throwing onCoalesceSettled hook does not replace the factory outcome', async () => {
  class ThrowingSettledCoalesce<T> extends Coalesce<T> {
    protected override onCoalesceSettled(): void {
      throw new Error('hook boom');
    }
  }

  const resolved = new ThrowingSettledCoalesce<string>();
  assert.equal(await resolved.run('resolve', async () => 'value'), 'value');

  const rejected = new ThrowingSettledCoalesce<string>();
  await assert.rejects(() => rejected.run('reject', async () => { throw new Error('factory-error'); }), /factory-error/);
  assert.equal(rejected.isInflight('reject'), false);
});
