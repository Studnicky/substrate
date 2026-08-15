import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { inlineArrowFunctions } from '../../../src/rules/v8/inlineArrowFunctions.js';
import { ObjectGuard } from '../../../src/rules/shared/ObjectGuard.js';
import scenarioGroups from './inlineArrowFunctions.scenarios.json' with { type: 'json' };

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

void describe('inline-arrow-functions', () => {
  void it('validates inline-arrow-functions scenarios', () => {
    ruleTester.run('inline-arrow-functions', inlineArrowFunctions, scenarioGroups);
  });

  void it('covers guard exits directly', () => {
    const reports: unknown[] = [];
    const listeners = inlineArrowFunctions.create({
      report(descriptor: unknown) {
        reports.push(descriptor);
      }
    } as never);

    // Non-BlockStatement body short-circuits before any position check runs.
    listeners.ArrowFunctionExpression?.({
      body: { type: 'Identifier' },
      parent: { type: 'Property', parent: { type: 'ObjectExpression' } }
    } as never);

    // BlockStatement body, but the containing shape matches none of the
    // recognized rebuilt-per-call/iteration positions.
    listeners.ArrowFunctionExpression?.({
      body: { type: 'BlockStatement' },
      parent: { type: 'MethodDefinition', parent: { type: 'ClassBody' } }
    } as never);

    assert.deepEqual(reports.map(toMessageId), []);
  });
});
