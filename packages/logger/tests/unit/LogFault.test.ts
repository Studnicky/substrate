import assert from 'node:assert/strict';
import { it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import { LogFault } from '../../src/index.js';

void it('creates a new builder instance', () => {
  const builder = LogFault.create();

  assert.ok(builder instanceof LogFault);
});

void it('builds fault with all required fields', () => {
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

const missingFieldScenarios: Array<{ description: string; build: () => unknown; expectedMessage: string }> = [
  {
    build: () => LogFault.create().operation('query').status('failed').name('Error').message('Something failed').context({}).build(),
    description: 'throws when component is missing',
    expectedMessage: 'LogFault: component is required'
  },
  {
    build: () => LogFault.create().component('graph').status('failed').name('Error').message('Something failed').context({}).build(),
    description: 'throws when operation is missing',
    expectedMessage: 'LogFault: operation is required'
  },
  {
    build: () => LogFault.create().component('graph').operation('query').name('Error').message('Something failed').context({}).build(),
    description: 'throws when status is missing',
    expectedMessage: 'LogFault: status is required'
  },
  {
    build: () => LogFault.create().component('graph').operation('query').status('failed').message('Something failed').context({}).build(),
    description: 'throws when name is missing',
    expectedMessage: 'LogFault: name is required'
  },
  {
    build: () => LogFault.create().component('graph').operation('query').status('failed').name('Error').context({}).build(),
    description: 'throws when message is missing',
    expectedMessage: 'LogFault: message is required'
  },
  {
    build: () => LogFault.create().component('graph').operation('query').status('failed').name('Error').message('Something failed').build(),
    description: 'throws when context is missing',
    expectedMessage: 'LogFault: context is required (use empty object {} if no context needed)'
  }
];

for (const { description, build, expectedMessage } of missingFieldScenarios) {
  void it(description, () => {
    assert.throws(build, { message: expectedMessage, name: 'LogBuildError' });
  });
}

void it('allows empty context object', () => {
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

void it('chains timing fields', () => {
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

void it('chains cause as string', () => {
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

void it('chains cause as Error', () => {
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

void it('chains stack trace', () => {
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

void it('merges multiple context calls', () => {
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

void it('extracts name and message from Error via fromError()', () => {
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

void it('extracts stack from Error via fromError()', () => {
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

void it('extracts cause from Error with Error cause via fromError()', () => {
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

void it('extracts cause from Error with string cause via fromError()', () => {
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

void it('returns frozen object', () => {
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

void it('a throwing onFieldSet hook surfaces as HookInvocationError', () => {
  class ThrowingFieldSetFault extends LogFault {
    constructor() { super(); }

    protected override onFieldSet(): void {
      throw new Error('onFieldSet boom');
    }
  }

  assert.throws(() => {
    new ThrowingFieldSetFault().component('graph');
  }, HookInvocationError);
});
