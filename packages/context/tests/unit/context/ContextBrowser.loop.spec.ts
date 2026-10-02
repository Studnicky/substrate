import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Context, ContextAsyncRuntime, ContextError } from '../../../src/browser/index.js';

class ContextBrowserTiming {
  static delay(milliseconds: number): Promise<void> {
    const result = new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
    return result;
  }
}

void describe('Context browser runtime', () => {
  void it('restores nested contexts around transformed awaits', async () => {
    const outerContext = Context.create({ 'name': 'outer' });
    const innerContext = Context.create({ 'name': 'inner' });
    const outerScope = outerContext.initialize({ 'id': 'outer' });
    const innerScope = innerContext.initialize({ 'id': 'inner' });

    await outerScope.execute(async () => {
      assert.strictEqual(outerContext.get('id'), 'outer');
      await ContextAsyncRuntime.await(innerScope.execute(async () => {
        assert.strictEqual(outerContext.get('id'), 'outer');
        assert.strictEqual(innerContext.get('id'), 'inner');
        await ContextAsyncRuntime.await(ContextBrowserTiming.delay(1));
        assert.strictEqual(outerContext.get('id'), 'outer');
        assert.strictEqual(innerContext.get('id'), 'inner');
      }));
      assert.strictEqual(outerContext.get('id'), 'outer');
      assert.strictEqual(innerContext.isActive(), false);
    });
  });

  void it('isolates overlapping transformed async scopes', async () => {
    const context = Context.create({ 'name': 'overlap' });
    const first = context.initialize({ 'id': 'first' });
    const second = context.initialize({ 'id': 'second' });

    const values = await Promise.all([
      first.execute(async () => {
        await ContextAsyncRuntime.await(ContextBrowserTiming.delay(5));
        const identifier = context.get('id');
        return identifier;
      }),
      second.execute(async () => {
        await ContextAsyncRuntime.await(ContextBrowserTiming.delay(1));
        const identifier = context.get('id');
        return identifier;
      })
    ]);

    assert.deepStrictEqual(values, ['first', 'second']);
  });

  void it('restores the scope after a rejected transformed await', async () => {
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

  void it('does not leak stores after a scope completes', async () => {
    const context = Context.create({ 'name': 'completion' });
    const scope = context.initialize({ 'id': 'completion' });

    await scope.execute(async () => {
      await ContextAsyncRuntime.await(ContextBrowserTiming.delay(1));
      assert.strictEqual(context.get('id'), 'completion');
    });

    assert.strictEqual(context.isActive(), false);
    assert.throws(() => {
      context.get('id');
    }, ContextError);
  });
});
