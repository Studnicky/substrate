import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { LogBody } from '../../src/index.js';

void describe('LogBody', () => {
  void describe('create()', () => {
    void it('should create a new builder instance', () => {
      const builder = LogBody.create();

      assert.ok(builder instanceof LogBody);
    });

    void it('should build body with all required fields', () => {
      const body = LogBody.create()
        .component('graph')
        .operation('query')
        .status('success')
        .message('Query executed')
        .context({ resultCount: 42 })
        .build();

      assert.strictEqual(body.event, 'graph.query');
      assert.strictEqual(body.status, 'success');
      assert.strictEqual(body.message, 'Query executed');
      assert.strictEqual(body.context.resultCount, 42);
    });

    void it('should throw when component is missing', () => {
      assert.throws(
        () => {
          LogBody.create()
            .operation('query')
            .status('success')
            .message('Test')
            .context({})
            .build();
        },
        { message: 'LogBody: component is required' }
      );
    });

    void it('should throw when operation is missing', () => {
      assert.throws(
        () => {
          LogBody.create()
            .component('graph')
            .status('success')
            .message('Test')
            .context({})
            .build();
        },
        { message: 'LogBody: operation is required' }
      );
    });

    void it('should throw when status is missing', () => {
      assert.throws(
        () => {
          LogBody.create()
            .component('graph')
            .operation('query')
            .message('Test')
            .context({})
            .build();
        },
        { message: 'LogBody: status is required' }
      );
    });

    void it('should throw when message is missing', () => {
      assert.throws(
        () => {
          LogBody.create()
            .component('graph')
            .operation('query')
            .status('success')
            .context({})
            .build();
        },
        { message: 'LogBody: message is required' }
      );
    });

    void it('should throw when context is missing', () => {
      assert.throws(
        () => {
          LogBody.create()
            .component('graph')
            .operation('query')
            .status('success')
            .message('Test')
            .build();
        },
        { message: 'LogBody: context is required (use empty object {} if no context needed)' }
      );
    });

    void it('should allow empty context object', () => {
      const body = LogBody.create()
        .component('graph')
        .operation('query')
        .status('success')
        .message('Test')
        .context({})
        .build();

      assert.strictEqual(body.event, 'graph.query');
    });
  });

  void describe('fluent chaining', () => {
    void it('should chain timing fields', () => {
      const body = LogBody.create()
        .component('graph')
        .operation('query')
        .status('success')
        .message('Done')
        .context({})
        .duration(234)
        .build();

      assert.strictEqual(body.durationMs, 234);
    });
  });

  void describe('context()', () => {
    void it('should merge multiple context calls', () => {
      const body = LogBody.create()
        .component('graph')
        .operation('query')
        .status('success')
        .message('Done')
        .context({ resultCount: 42 })
        .context({ queryType: 'SELECT' })
        .build();

      assert.strictEqual(body.context.resultCount, 42);
      assert.strictEqual(body.context.queryType, 'SELECT');
    });
  });

  void describe('immutability', () => {
    void it('should return frozen object', () => {
      const body = LogBody.create()
        .component('graph')
        .operation('query')
        .status('success')
        .message('Done')
        .context({})
        .build();

      assert.strictEqual(Object.isFrozen(body), true);
    });
  });

  void describe('valid status values', () => {
    const validStatuses = [
      'pending',
      'in_progress',
      'complete',
      'success',
      'partial',
      'cached',
      'skipped',
      'failed',
      'timeout',
      'invalid',
      'not_found',
      'unauthorized',
      'rate_limited',
      'unavailable',
      'retrying',
      'retry_exhausted'
    ] as const;

    for (const status of validStatuses) {
      void it(`should accept status '${status}'`, () => {
        const body = LogBody.create()
          .component('StatusValidator')
          .operation('validate')
          .status(status)
          .message('Test')
          .context({})
          .build();

        assert.strictEqual(body.status, status);
      });
    }
  });
});
