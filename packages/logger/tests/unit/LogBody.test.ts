import assert from 'node:assert/strict';
import { it } from 'node:test';

import { LogBody } from '../../src/index.js';

void it('creates an immutable body from one configuration object', () => {
  const context = { 'details': { 'rows': 42 }, 'resultCount': 42 };
  const body = LogBody.create({
    'component': 'graph',
    'context': context,
    'message': 'Query executed',
    'operation': 'query',
    'status': 'success'
  });

  assert.strictEqual(body.event, 'graph.query');
  assert.strictEqual(body.status, 'success');
  assert.strictEqual(body.message, 'Query executed');
  assert.strictEqual(body.context.resultCount, 42);
  assert.strictEqual(Object.isFrozen(body), true);
  assert.strictEqual(Object.isFrozen(body.context), true);
  assert.strictEqual(Object.isFrozen(body.context.details), true);
  context.details.rows = 0;
  assert.strictEqual(body.context.details.rows, 42);
});

const missingFieldScenarios: Array<{
  readonly 'config': Readonly<Record<string, unknown>>;
  readonly 'description': string;
  readonly 'expectedMessage': string;
}> = [
  {
    'config': { 'context': {}, 'message': 'Test', 'operation': 'query', 'status': 'success' },
    'description': 'throws when component is missing',
    'expectedMessage': 'LogBody: component is required'
  },
  {
    'config': { 'component': 'graph', 'context': {}, 'message': 'Test', 'status': 'success' },
    'description': 'throws when operation is missing',
    'expectedMessage': 'LogBody: operation is required'
  },
  {
    'config': { 'component': 'graph', 'context': {}, 'message': 'Test', 'operation': 'query' },
    'description': 'throws when status is missing',
    'expectedMessage': 'LogBody: status is required'
  },
  {
    'config': { 'component': 'graph', 'message': 'Test', 'operation': 'query', 'status': 'success' },
    'description': 'throws when context is missing',
    'expectedMessage': 'LogBody: context is required (use empty object {} if no context needed)'
  },
  {
    'config': { 'component': 'graph', 'context': {}, 'operation': 'query', 'status': 'success' },
    'description': 'throws when message is missing',
    'expectedMessage': 'LogBody: message is required'
  }
];

for (const { config, description, expectedMessage } of missingFieldScenarios) {
  void it(description, () => {
    assert.throws(
      () => Reflect.apply(LogBody.create, LogBody, [config]),
      { 'message': expectedMessage, 'name': 'LogBuildError' }
    );
  });
}

void it('accepts optional duration and empty context', () => {
  const body = LogBody.create({
    'component': 'graph',
    'context': {},
    'durationMs': 234,
    'message': 'Done',
    'operation': 'query',
    'status': 'success'
  });

  assert.strictEqual(body.durationMs, 234);
  assert.deepStrictEqual(body.context, {});
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
    const body = LogBody.create({
      'component': 'StatusValidator',
      'context': {},
      'message': 'Test',
      'operation': 'validate',
      'status': status
    });

    assert.strictEqual(body.status, status);
  });
}
