import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { memoizeArrayLength } from '../../../src/rules/v8/memoizeArrayLength.js';
import { ObjectGuard } from '../../../src/rules/shared/ObjectGuard.js';
import scenarioGroups from './memoizeArrayLength.scenarios.json' with { type: 'json' };

function toMessageId(report: unknown): string {
  if (!ObjectGuard.isObject(report)) { return '<no-messageId>'; }
  const { messageId } = report;
  return typeof messageId === 'string' ? messageId : '<no-messageId>';
}

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('memoize-array-length', () => {
  void it('validates memoize-array-length scenarios', () => {
    ruleTester.run('memoize-array-length', memoizeArrayLength, scenarioGroups);
  });

  void it('covers guard exits directly', () => {
    const reports: unknown[] = [];
    const listeners = memoizeArrayLength.create({
      report(descriptor: unknown) {
        reports.push(descriptor);
      }
    } as never);

    // ForStatement with no test (`for (;;)`) - guarded, not crashed.
    listeners.ForStatement?.({ test: null } as never);
    listeners['ForStatement:exit']?.({ test: null } as never);

    // WhileStatement whose test is an unrelated comparison - not tracked.
    listeners.WhileStatement?.({
      test: {
        left: { name: 'i', type: 'Identifier' },
        operator: '<',
        right: { type: 'Literal', value: 10 },
        type: 'BinaryExpression'
      }
    } as never);
    listeners['WhileStatement:exit']?.({
      test: {
        left: { name: 'i', type: 'Identifier' },
        operator: '<',
        right: { type: 'Literal', value: 10 },
        type: 'BinaryExpression'
      }
    } as never);

    // AssignmentExpression that isn't a plain `=` reassignment.
    listeners.AssignmentExpression?.({
      left: { name: 'len', type: 'Identifier' },
      operator: '+=',
      right: {
        computed: false,
        object: { name: 'arr', type: 'Identifier' },
        property: { name: 'length', type: 'Identifier' },
        type: 'MemberExpression'
      }
    } as never);

    // AssignmentExpression not enclosed by any loop - not tracked (no crash walking to Program).
    listeners.AssignmentExpression?.({
      left: { name: 'len', type: 'Identifier' },
      operator: '=',
      parent: { parent: null, type: 'Program' },
      right: {
        computed: false,
        object: { name: 'arr', type: 'Identifier' },
        property: { name: 'length', type: 'Identifier' },
        type: 'MemberExpression'
      }
    } as never);

    assert.deepEqual(reports.map(toMessageId), []);
  });
});
