import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Context } from '../../../src/browser/index.js';
import { Context as NodeContext } from '../../../src/node/index.js';

function delay(milliseconds: number): Promise<void> {
  const result = new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
  return result;
}

describe('Context.run', () => {
  it('returns a synchronous operation value and cleans up its scope', () => {
    const context = NodeContext.create({ 'name': 'sync-run' });
    const result = context.run({ 'id': 'sync' }, (scope) => {
      assert.strictEqual(typeof scope.execute, 'function');
      assert.strictEqual(context.get('id'), 'sync');
      context.set('state', 'complete');
      return 42;
    });

    assert.deepStrictEqual(result, {
      'snapshot': { 'id': 'sync', 'state': 'complete' },
      'value': 42
    });
    assert.strictEqual(context.isActive(), false);
    assert.throws(() => context.get('id'));
  });

  it('returns an asynchronous operation value and cleans up its scope', async () => {
    const context = NodeContext.create({ 'name': 'async-run' });
    const result = await context.run({ 'id': 'async' }, async (scope) => {
      await scope.await(delay(1));
      context.set('state', 'complete');
      return 'done';
    });

    assert.deepStrictEqual(result, {
      'snapshot': { 'id': 'async', 'state': 'complete' },
      'value': 'done'
    });
    assert.strictEqual(context.isActive(), false);
    assert.throws(() => context.get('id'));
  });

  it('cleans up after a rejected operation without swallowing the rejection', async () => {
    const context = NodeContext.create({ 'name': 'rejected-run' });
    const failure = new Error('operation failed');

    await assert.rejects(context.run({ 'id': 'rejected' }, async (scope) => {
      await scope.await(delay(1));
      throw failure;
    }), failure);

    assert.strictEqual(context.isActive(), false);
    assert.throws(() => context.get('id'));
  });
});

describe('Context scope helpers', () => {
  it('isolates overlapping browser scopes through scope.await', async () => {
    const context = Context.create({ 'name': 'browser-await' });
    const firstScope = context.initialize({ 'id': 'first' });
    const secondScope = context.initialize({ 'id': 'second' });

    const values = await Promise.all([
      firstScope.execute(async () => {
        await firstScope.await(delay(5));
        return context.get('id');
      }),
      secondScope.execute(async () => {
        await secondScope.await(delay(1));
        return context.get('id');
      })
    ]);

    assert.deepStrictEqual(values, ['first', 'second']);
    assert.strictEqual(context.isActive(), false);
  });

  it('binds callback arguments and return values to the scope storage', () => {
    const context = NodeContext.create({ 'name': 'bound-callback' });
    const scope = context.initialize({ 'id': 'bound' });
    const callback = scope.bind((prefix: string, suffix: string): string => {
      assert.strictEqual(context.get('id'), 'bound');
      return prefix + ":" + suffix;
    });
    const result = callback('first', 'second');

    assert.strictEqual(result, 'first:second');
    scope.terminate();
    assert.strictEqual(context.isActive(), false);
  });
});
