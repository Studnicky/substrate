import assert from 'node:assert/strict';
import { it } from 'node:test';

import { LogFault } from '../../src/index.js';

void it('creates an immutable fault from one configuration object', () => {
  const context = { 'details': { 'attempt': 1 }, 'query': 'SELECT...' };
  const fault = LogFault.create({
    'component': 'graph',
    'context': context,
    'message': 'Query exceeded timeout',
    'name': 'TimeoutError',
    'operation': 'query',
    'status': 'failed'
  });

  assert.strictEqual(fault.event, 'graph.query');
  assert.strictEqual(fault.status, 'failed');
  assert.strictEqual(fault.name, 'TimeoutError');
  assert.strictEqual(fault.message, 'Query exceeded timeout');
  assert.strictEqual(fault.context.query, 'SELECT...');
  assert.strictEqual(Object.isFrozen(fault), true);
  assert.strictEqual(Object.isFrozen(fault.context), true);
  assert.strictEqual(Object.isFrozen(fault.context.details), true);
  context.details.attempt = 2;
  assert.strictEqual(fault.context.details.attempt, 1);
});

const missingFieldScenarios: Array<{
  readonly 'config': Readonly<Record<string, unknown>>;
  readonly 'description': string;
  readonly 'expectedMessage': string;
}> = [
  {
    'config': { 'context': {}, 'message': 'Failed', 'name': 'Error', 'operation': 'query', 'status': 'failed' },
    'description': 'throws when component is missing',
    'expectedMessage': 'LogFault: component is required'
  },
  {
    'config': { 'component': 'graph', 'context': {}, 'message': 'Failed', 'name': 'Error', 'status': 'failed' },
    'description': 'throws when operation is missing',
    'expectedMessage': 'LogFault: operation is required'
  },
  {
    'config': { 'component': 'graph', 'context': {}, 'message': 'Failed', 'name': 'Error', 'operation': 'query' },
    'description': 'throws when status is missing',
    'expectedMessage': 'LogFault: status is required'
  },
  {
    'config': { 'component': 'graph', 'message': 'Failed', 'name': 'Error', 'operation': 'query', 'status': 'failed' },
    'description': 'throws when context is missing',
    'expectedMessage': 'LogFault: context is required (use empty object {} if no context needed)'
  },
  {
    'config': { 'component': 'graph', 'context': {}, 'message': 'Failed', 'operation': 'query', 'status': 'failed' },
    'description': 'throws when name is missing',
    'expectedMessage': 'LogFault: name is required'
  },
  {
    'config': { 'component': 'graph', 'context': {}, 'name': 'Error', 'operation': 'query', 'status': 'failed' },
    'description': 'throws when message is missing',
    'expectedMessage': 'LogFault: message is required'
  }
];

for (const { config, description, expectedMessage } of missingFieldScenarios) {
  void it(description, () => {
    assert.throws(
      () => Reflect.apply(LogFault.create, LogFault, [config]),
      { 'message': expectedMessage, 'name': 'LogBuildError' }
    );
  });
}

void it('accepts optional fault fields', () => {
  const fault = LogFault.create({
    'cause': 'Connection pool exhausted',
    'component': 'graph',
    'context': {},
    'durationMs': 30_000,
    'message': 'Query timeout',
    'name': 'TimeoutError',
    'operation': 'query',
    'stack': 'Error: Query timeout\n    at foo.js:10:5',
    'status': 'timeout'
  });

  assert.strictEqual(fault.cause, 'Connection pool exhausted');
  assert.strictEqual(fault.durationMs, 30_000);
  assert.strictEqual(fault.stack, 'Error: Query timeout\n    at foo.js:10:5');
});

void it('accepts explicitly mapped Error fields', () => {
  const sourceError = new Error('Wrapper error', { 'cause': new Error('Root cause') });
  const sourceCause = sourceError.cause;
  const cause = sourceCause instanceof Error
    ? sourceCause.message
    : sourceCause === undefined ? undefined : String(sourceCause);
  const fault = LogFault.create({
    ...(cause !== undefined && { 'cause': cause }),
    'component': 'graph',
    'context': {},
    'message': sourceError.message,
    'name': sourceError.name,
    'operation': 'query',
    ...(sourceError.stack !== undefined && { 'stack': sourceError.stack }),
    'status': 'failed'
  });

  assert.strictEqual(fault.name, 'Error');
  assert.strictEqual(fault.message, 'Wrapper error');
  assert.strictEqual(fault.cause, 'Root cause');
  assert.ok(fault.stack?.includes('Wrapper error'));
});
