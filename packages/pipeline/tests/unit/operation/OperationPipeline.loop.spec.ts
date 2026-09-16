import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import type { OperationPipelineInterface } from '../../../src/interfaces/OperationPipelineInterface.js';

import { OperationPipeline } from '../../../src/operation/OperationPipeline.js';

void describe('OperationPipeline', () => {
  void it('enters interceptors in declared order and unwinds in reverse order', async () => {
    const order: string[] = [];
    const pipeline = OperationPipeline.create<{ requestId: string }>([
      async (context, next) => {
        order.push(`first:before:${context.requestId}`);
        const result = await next(context);
        order.push('first:after');
        return result;
      },
      async (context, next) => {
        order.push(`second:before:${context.requestId}`);
        const result = await next(context);
        order.push('second:after');
        return result;
      }
    ]);

    const result = await pipeline.run({ 'requestId': 'request-1' }, async (context) => {
      order.push(`operation:${context.requestId}`);
      return 'complete';
    });

    assert.strictEqual(result, 'complete');
    assert.deepStrictEqual(order, [
      'first:before:request-1',
      'second:before:request-1',
      'operation:request-1',
      'second:after',
      'first:after'
    ]);
  });

  void it('returns the exact operation result', async () => {
    const expectedResult = { 'accepted': true };
    const pipeline: OperationPipelineInterface<string> = OperationPipeline.create<string>([]);

    const result = await pipeline.run('request-2', async () => expectedResult);

    assert.strictEqual(result, expectedResult);
  });

  void it('supports different result types for separate runs', async () => {
    const pipeline = OperationPipeline.create<string>([
      (context, next) => next(context)
    ]);

    const textResult = await pipeline.run('request-3', async () => 'complete');
    const objectResult = await pipeline.run('request-4', async () => ({ 'accepted': true }));

    assert.strictEqual(textResult, 'complete');
    assert.deepStrictEqual(objectResult, { 'accepted': true });
  });

  void it('rethrows the exact operation error', async () => {
    const expectedError = new Error('operation failed');
    const pipeline = OperationPipeline.create<string>([]);

    await assert.rejects(async () => {
      try {
        await pipeline.run('request-5', async () => { throw expectedError; });
      } catch (error) {
        assert.strictEqual(error, expectedError);
        throw error;
      }
    });
  });

  void it('rethrows the exact interceptor error', async () => {
    const expectedError = new Error('interceptor failed');
    const pipeline = OperationPipeline.create<string>([
      () => { throw expectedError; }
    ]);

    await assert.rejects(async () => {
      try {
        await pipeline.run('request-6', async () => 'unreachable');
      } catch (error) {
        assert.strictEqual(error, expectedError);
        throw error;
      }
    });
  });

  void it('runs the supplied operation directly when it has no interceptors', async () => {
    const pipeline = OperationPipeline.create<number>([]);

    const result = await pipeline.run(21, async (value) => value * 2);

    assert.strictEqual(result, 42);
  });
});
