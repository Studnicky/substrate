import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { regexpInLoops } from '../../../src/rules/v8/regexpInLoops.js';
import scenarioGroups from './regexpInLoops.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('regexp-in-loops', () => {
  void it('validates regexp-in-loops scenarios', () => {
    ruleTester.run('regexp-in-loops', regexpInLoops, scenarioGroups);
  });

  void it('ignores malformed RegExp callee shapes', () => {
    const reports: unknown[] = [];
    const listeners = regexpInLoops.create({
      report(descriptor) {
        reports.push(descriptor);
      }
    } as never);

    listeners.CallExpression?.({
      type: 'CallExpression',
      callee: null
    } as never);

    listeners.NewExpression?.({
      type: 'NewExpression',
      callee: { type: 'Identifier', name: 'Date' }
    } as never);

    listeners.NewExpression?.({
      type: 'NewExpression',
      callee: {}
    } as never);

    assert.equal(reports.length, 0);
  });
});
