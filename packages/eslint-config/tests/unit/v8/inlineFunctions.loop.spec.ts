import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { inlineFunctions } from '../../../src/rules/v8/inlineFunctions.js';
import { ObjectGuard } from '../../../src/rules/shared/ObjectGuard.js';
import scenarioGroups from './inlineFunctions.scenarios.json' with { type: 'json' };

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

void describe('inline-functions', () => {
  void it('validates inline-functions scenarios', () => {
    ruleTester.run('inline-functions', inlineFunctions, scenarioGroups);
  });

  void it('covers guard exits directly', () => {
    const reports: unknown[] = [];
    const listeners = inlineFunctions.create({
      report(descriptor: unknown) {
        reports.push(descriptor);
      }
    } as never);

    // BlockStatement body (always true for FunctionExpression), but the
    // containing shape matches none of the recognized rebuilt-per-call/iteration
    // positions.
    listeners.FunctionExpression?.({
      parent: { type: 'ClassBody' }
    } as never);

    assert.deepEqual(reports.map(toMessageId), []);
  });
});
