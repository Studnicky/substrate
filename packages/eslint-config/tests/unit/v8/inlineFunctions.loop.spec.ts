import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { inlineFunctions } from '../../../src/rules/v8/inlineFunctions.js';
import scenarioGroups from './inlineFunctions.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('inline-functions', () => {
  void it('validates inline-functions scenarios', () => {
    ruleTester.run('inline-functions', inlineFunctions, scenarioGroups);
  });

  void it('covers guard exits and scope checks directly', () => {
    const reports: unknown[] = [];
    const listeners = inlineFunctions.create({
      report(descriptor) {
        reports.push(descriptor);
      }
    } as never);

    listeners.Property?.({
      parent: { type: 'ObjectExpression' },
      value: { type: 'Identifier' }
    } as never);

    listeners.Property?.({
      parent: { type: 'ObjectExpression' },
      value: null
    } as never);

    listeners.Property?.({
      parent: { type: 'ClassBody' },
      value: { type: 'FunctionExpression' }
    } as never);

    listeners.Property?.({
      parent: {
        parent: {
          type: 'FunctionDeclaration'
        },
        type: 'ObjectExpression'
      },
      value: { type: 'FunctionExpression' }
    } as never);

    assert.equal(reports.length, 1);
  });
});
