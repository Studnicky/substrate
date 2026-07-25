import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { maxSwitchCases } from '../../../src/rules/v8/maxSwitchCases.js';
import { ObjectGuard } from '../../../src/rules/shared/ObjectGuard.js';
import scenarioGroups from './maxSwitchCases.scenarios.json';

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

void describe('max-switch-cases', () => {
  void it('validates max-switch-cases scenarios', () => {
    ruleTester.run('max-switch-cases', maxSwitchCases, scenarioGroups);
  });

  void it('returns early when cases is not an array', () => {
    const reports: unknown[] = [];
    const listeners = maxSwitchCases.create({
      report(descriptor) {
        reports.push(descriptor);
      }
    } as never);

    listeners.SwitchStatement?.({ cases: undefined } as never);

    assert.deepEqual(reports.map(toMessageId), []);
  });
});
