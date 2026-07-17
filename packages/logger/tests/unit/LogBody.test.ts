import assert from 'node:assert/strict';
import { it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import { LogBody } from '../../src/index.js';

void it('creates a new builder instance', () => {
  const builder = LogBody.create();

  assert.ok(builder instanceof LogBody);
});

void it('builds body with all required fields', () => {
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

const missingFieldScenarios: Array<{ description: string; build: () => unknown; expectedMessage: string }> = [
  {
    build: () => LogBody.create().operation('query').status('success').message('Test').context({}).build(),
    description: 'throws when component is missing',
    expectedMessage: 'LogBody: component is required'
  },
  {
    build: () => LogBody.create().component('graph').status('success').message('Test').context({}).build(),
    description: 'throws when operation is missing',
    expectedMessage: 'LogBody: operation is required'
  },
  {
    build: () => LogBody.create().component('graph').operation('query').message('Test').context({}).build(),
    description: 'throws when status is missing',
    expectedMessage: 'LogBody: status is required'
  },
  {
    build: () => LogBody.create().component('graph').operation('query').status('success').context({}).build(),
    description: 'throws when message is missing',
    expectedMessage: 'LogBody: message is required'
  },
  {
    build: () => LogBody.create().component('graph').operation('query').status('success').message('Test').build(),
    description: 'throws when context is missing',
    expectedMessage: 'LogBody: context is required (use empty object {} if no context needed)'
  }
];

for (const { description, build, expectedMessage } of missingFieldScenarios) {
  void it(description, () => {
    assert.throws(build, { message: expectedMessage, name: 'LogBuildError' });
  });
}

void it('allows empty context object', () => {
  const body = LogBody.create()
    .component('graph')
    .operation('query')
    .status('success')
    .message('Test')
    .context({})
    .build();

  assert.strictEqual(body.event, 'graph.query');
});

void it('chains timing fields', () => {
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

void it('merges multiple context calls', () => {
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

void it('returns frozen object', () => {
  const body = LogBody.create()
    .component('graph')
    .operation('query')
    .status('success')
    .message('Done')
    .context({})
    .build();

  assert.strictEqual(Object.isFrozen(body), true);
});

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
  void it(`accepts status '${status}'`, () => {
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

void it('a throwing onFieldSet hook surfaces as HookInvocationError', () => {
  class ThrowingFieldSetBody extends LogBody {
    constructor() { super(); }

    protected override onFieldSet(): void {
      throw new Error('onFieldSet boom');
    }
  }

  assert.throws(() => {
    new ThrowingFieldSetBody().component('graph');
  }, HookInvocationError);
});
