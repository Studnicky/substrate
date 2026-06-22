import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { LogFault } from '../../src/index.js';

void describe('LogFault', () => {
  void describe('create()', () => {
    void it('should create a new builder instance', () => {
      const builder = LogFault.create();

      assert.ok(builder instanceof LogFault);
    });

    void it('should build fault with all required fields', () => {
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('failed')
        .name('TimeoutError')
        .message('Query exceeded timeout')
        .context({ query: 'SELECT...' })
        .build();

      assert.strictEqual(fault.event, 'graph.query');
      assert.strictEqual(fault.status, 'failed');
      assert.strictEqual(fault.name, 'TimeoutError');
      assert.strictEqual(fault.message, 'Query exceeded timeout');
      assert.strictEqual(fault.context.query, 'SELECT...');
    });

    void it('should throw when component is missing', () => {
      assert.throws(
        () => {
          LogFault.create()
            .operation('query')
            .status('failed')
            .name('Error')
            .message('Something failed')
            .context({})
            .build();
        },
        { message: 'LogFault: component is required' }
      );
    });

    void it('should throw when operation is missing', () => {
      assert.throws(
        () => {
          LogFault.create()
            .component('graph')
            .status('failed')
            .name('Error')
            .message('Something failed')
            .context({})
            .build();
        },
        { message: 'LogFault: operation is required' }
      );
    });

    void it('should throw when status is missing', () => {
      assert.throws(
        () => {
          LogFault.create()
            .component('graph')
            .operation('query')
            .name('Error')
            .message('Something failed')
            .context({})
            .build();
        },
        { message: 'LogFault: status is required' }
      );
    });

    void it('should throw when name is missing', () => {
      assert.throws(
        () => {
          LogFault.create()
            .component('graph')
            .operation('query')
            .status('failed')
            .message('Something failed')
            .context({})
            .build();
        },
        { message: 'LogFault: name is required' }
      );
    });

    void it('should throw when message is missing', () => {
      assert.throws(
        () => {
          LogFault.create()
            .component('graph')
            .operation('query')
            .status('failed')
            .name('Error')
            .context({})
            .build();
        },
        { message: 'LogFault: message is required' }
      );
    });

    void it('should throw when context is missing', () => {
      assert.throws(
        () => {
          LogFault.create()
            .component('graph')
            .operation('query')
            .status('failed')
            .name('Error')
            .message('Something failed')
            .build();
        },
        { message: 'LogFault: context is required (use empty object {} if no context needed)' }
      );
    });

    void it('should allow empty context object', () => {
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('failed')
        .name('Error')
        .message('Something failed')
        .context({})
        .build();

      assert.strictEqual(fault.event, 'graph.query');
    });
  });

  void describe('fluent chaining', () => {
    void it('should chain timing fields', () => {
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('timeout')
        .name('TimeoutError')
        .message('Query timeout')
        .context({})
        .duration(30_000)
        .build();

      assert.strictEqual(fault.durationMs, 30_000);
    });

    void it('should chain cause as string', () => {
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('failed')
        .name('TimeoutError')
        .message('Query timeout')
        .context({})
        .cause('Connection pool exhausted')
        .build();

      assert.strictEqual(fault.cause, 'Connection pool exhausted');
    });

    void it('should chain cause as Error', () => {
      const underlyingError = new Error('Connection refused');
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('failed')
        .name('TimeoutError')
        .message('Query timeout')
        .context({})
        .cause(underlyingError)
        .build();

      assert.strictEqual(fault.cause, 'Connection refused');
    });

    void it('should chain stack trace', () => {
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('failed')
        .name('Error')
        .message('Something failed')
        .context({})
        .stack('Error: Something failed\n    at foo.js:10:5')
        .build();

      assert.strictEqual(fault.stack, 'Error: Something failed\n    at foo.js:10:5');
    });
  });

  void describe('context()', () => {
    void it('should merge multiple context calls', () => {
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('failed')
        .name('Error')
        .message('Failed')
        .context({ query: 'SELECT...' })
        .context({ attemptCount: 3 })
        .build();

      assert.strictEqual(fault.context.query, 'SELECT...');
      assert.strictEqual(fault.context.attemptCount, 3);
    });
  });

  void describe('fromError()', () => {
    void it('should extract name and message from Error', () => {
      const sourceError = new TypeError('Cannot read property x');
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('failed')
        .fromError(sourceError)
        .context({})
        .build();

      assert.strictEqual(fault.name, 'TypeError');
      assert.strictEqual(fault.message, 'Cannot read property x');
    });

    void it('should extract stack from Error', () => {
      const sourceError = new Error('Test error');
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('failed')
        .fromError(sourceError)
        .context({})
        .build();

      assert.ok(fault.stack !== undefined);
      assert.ok(fault.stack.includes('Test error'));
    });

    void it('should extract cause from Error with Error cause', () => {
      const causeError = new Error('Root cause');
      const sourceError = new Error('Wrapper error', { cause: causeError });
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('failed')
        .fromError(sourceError)
        .context({})
        .build();

      assert.strictEqual(fault.cause, 'Root cause');
    });

    void it('should extract cause from Error with string cause', () => {
      const sourceError = new Error('Wrapper error', { cause: 'String cause' });
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('failed')
        .fromError(sourceError)
        .context({})
        .build();

      assert.strictEqual(fault.cause, 'String cause');
    });
  });

  void describe('immutability', () => {
    void it('should return frozen object', () => {
      const fault = LogFault.create()
        .component('graph')
        .operation('query')
        .status('failed')
        .name('Error')
        .message('Something failed')
        .context({})
        .build();

      assert.strictEqual(Object.isFrozen(fault), true);
    });
  });
});
