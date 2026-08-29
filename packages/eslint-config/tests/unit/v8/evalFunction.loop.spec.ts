import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { evalFunction } from '../../../src/rules/v8/evalFunction.js';
import { Predicates } from '@studnicky/types';
import scenarioGroups from './evalFunction.scenarios.json' with { type: 'json' };

function toMessageId(report: unknown): string {
  if (!Predicates.isRecord(report)) { return '<no-messageId>'; }
  const { messageId } = report;
  return typeof messageId === 'string' ? messageId : '<no-messageId>';
}

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('eval-function', () => {
  void it('validates eval-function scenarios', () => {
    ruleTester.run('eval-function', evalFunction, scenarioGroups);
  });

  void it('covers guard exits directly', () => {
    const reports: unknown[] = [];
    const listeners = evalFunction.create({
      report(descriptor: unknown) {
        reports.push(descriptor);
      }
    } as never);

    // VariableDeclarator whose id is not a plain Identifier - not tracked as an alias.
    listeners.VariableDeclarator?.({
      id: { type: 'ObjectPattern' },
      init: { name: 'eval', type: 'Identifier' }
    } as never);

    // VariableDeclarator whose init is not an eval reference - not tracked.
    listeners.VariableDeclarator?.({
      id: { name: 'notEval', type: 'Identifier' },
      init: { type: 'Literal', value: 1 }
    } as never);

    // CallExpression whose callee is an untracked, non-eval identifier.
    listeners.CallExpression?.({
      callee: { name: 'somethingElse', type: 'Identifier' }
    } as never);

    // MemberExpression callee on an object other than globalThis/window/self.
    listeners.CallExpression?.({
      callee: {
        computed: false,
        object: { name: 'obj', type: 'Identifier' },
        property: { name: 'eval', type: 'Identifier' },
        type: 'MemberExpression'
      }
    } as never);

    // NewExpression callee name that is not "Function".
    listeners.NewExpression?.({
      callee: { name: 'NotFunction', type: 'Identifier' }
    } as never);

    // SequenceExpression with zero expressions - guarded, not crashed.
    listeners.CallExpression?.({
      callee: { expressions: [], type: 'SequenceExpression' }
    } as never);

    assert.deepEqual(reports.map(toMessageId), []);
  });
});
