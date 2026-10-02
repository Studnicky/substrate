import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as browserRuntime from '../../../src/browser/index.js';
import * as nodeRuntime from '../../../src/node/index.js';

class OperationFailedError extends BaseError {
  public override readonly name: string = 'OperationFailedError';

  public constructor(message: string) {
    super({
      'code': 'context.testOperationFailed',
      'message': message,
      'retryable': false
    });
  }
}

class ContextRunTiming {
  static delay(milliseconds: number): Promise<void> {
    const result = new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
    return result;
  }
}

void describe('Context.run and Context.runAsync', () => {
  void it('returns a synchronous operation value and cleans up its scope', () => {
    const context = nodeRuntime.Context.create({ 'name': 'sync-run' });
    const result = context.run({ 'id': 'sync' }, (scope) => {
      assert.strictEqual(typeof scope.execute, 'function');
      assert.strictEqual(context.get('id'), 'sync');
      context.set('state', 'complete');
      return 42;
    });

    assert.deepStrictEqual(result, {
      'snapshot': new Map([['id', 'sync'], ['state', 'complete']]),
      'value': 42
    });
    assert.strictEqual(context.isActive(), false);
    assert.throws(() => {
      context.get('id');
    });
  });

  void it('returns an asynchronous operation value and cleans up its scope', async () => {
    const context = nodeRuntime.Context.create({ 'name': 'async-run' });
    const result = await context.runAsync({ 'id': 'async' }, async (scope) => {
      await scope.await(ContextRunTiming.delay(1));
      context.set('state', 'complete');
      return 'done';
    });

    assert.deepStrictEqual(result, {
      'snapshot': new Map([['id', 'async'], ['state', 'complete']]),
      'value': 'done'
    });
    assert.strictEqual(context.isActive(), false);
    assert.throws(() => {
      context.get('id');
    });
  });

  void it('cleans up after a rejected operation without swallowing the rejection', async () => {
    const context = nodeRuntime.Context.create({ 'name': 'rejected-run' });
    const failure = new OperationFailedError('operation failed');

    await assert.rejects(context.runAsync({ 'id': 'rejected' }, async (scope) => {
      await scope.await(ContextRunTiming.delay(1));
      throw failure;
    }), failure);

    assert.strictEqual(context.isActive(), false);
    assert.throws(() => {
      context.get('id');
    });
  });
});

void describe('Context scope helpers', () => {
  void it('isolates overlapping browser scopes through scope.await', async () => {
    const context = browserRuntime.Context.create({ 'name': 'browser-await' });
    const firstScope = context.initialize({ 'id': 'first' });
    const secondScope = context.initialize({ 'id': 'second' });

    const values = await Promise.all([
      firstScope.execute(async () => {
        await firstScope.await(ContextRunTiming.delay(5));
        const identifier = context.get('id');
        return identifier;
      }),
      secondScope.execute(async () => {
        await secondScope.await(ContextRunTiming.delay(1));
        const identifier = context.get('id');
        return identifier;
      })
    ]);

    assert.deepStrictEqual(values, ['first', 'second']);
    assert.strictEqual(context.isActive(), false);
  });

  void it('binds callback arguments and return values to the scope storage', () => {
    const context = nodeRuntime.Context.create({ 'name': 'bound-callback' });
    const scope = context.initialize({ 'id': 'bound' });
    const callback = scope.bind((prefix: string, suffix: string): string => {
      assert.strictEqual(context.get('id'), 'bound');
      return `${prefix  }:${  suffix}`;
    });
    const result = callback('first', 'second');

    assert.strictEqual(result, 'first:second');
    scope.terminate();
    assert.strictEqual(context.isActive(), false);
  });
});
