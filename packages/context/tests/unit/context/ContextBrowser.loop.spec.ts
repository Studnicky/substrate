import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Context, ContextAsyncRuntime, ContextError } from '../../../src/browser/index.js';

function delay(milliseconds: number): Promise<void> {
  const result = new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
  return result;
}

describe('Context browser runtime', () => {
  it('restores nested contexts around transformed awaits', async () => {
    const outerContext = Context.create({ 'name': 'outer' });
    const innerContext = Context.create({ 'name': 'inner' });
    const outerScope = outerContext.initialize({ 'id': 'outer' });
    const innerScope = innerContext.initialize({ 'id': 'inner' });

    await outerScope.execute(async () => {
      assert.strictEqual(outerContext.get('id'), 'outer');
      await ContextAsyncRuntime.await(innerScope.execute(async () => {
        assert.strictEqual(outerContext.get('id'), 'outer');
        assert.strictEqual(innerContext.get('id'), 'inner');
        await ContextAsyncRuntime.await(delay(1));
        assert.strictEqual(outerContext.get('id'), 'outer');
        assert.strictEqual(innerContext.get('id'), 'inner');
      }));
      assert.strictEqual(outerContext.get('id'), 'outer');
      assert.strictEqual(innerContext.isActive(), false);
    });
  });

  it('isolates overlapping transformed async scopes', async () => {
    const context = Context.create({ 'name': 'overlap' });
    const first = context.initialize({ 'id': 'first' });
    const second = context.initialize({ 'id': 'second' });

    const values = await Promise.all([
      first.execute(async () => {
        await ContextAsyncRuntime.await(delay(5));
        return context.get('id');
      }),
      second.execute(async () => {
        await ContextAsyncRuntime.await(delay(1));
        return context.get('id');
      })
    ]);

    assert.deepStrictEqual(values, ['first', 'second']);
  });

  it('restores the scope after a rejected transformed await', async () => {
    const context = Context.create({ 'name': 'rejection' });
    const scope = context.initialize({ 'id': 'rejection' });
    const failure = new ContextError('expected rejection');

    await scope.execute(async () => {
      let caught: unknown;
      try {
        await ContextAsyncRuntime.await(Promise.reject(failure));
      } catch (error) {
        caught = error;
      }
      assert.strictEqual(caught, failure);
      assert.strictEqual(context.get('id'), 'rejection');
    });
  });

  it('does not leak stores after a scope completes', async () => {
    const context = Context.create({ 'name': 'completion' });
    const scope = context.initialize({ 'id': 'completion' });

    await scope.execute(async () => {
      await ContextAsyncRuntime.await(delay(1));
      assert.strictEqual(context.get('id'), 'completion');
    });

    assert.strictEqual(context.isActive(), false);
    assert.throws(() => context.get('id'), ContextError);
  });
});
