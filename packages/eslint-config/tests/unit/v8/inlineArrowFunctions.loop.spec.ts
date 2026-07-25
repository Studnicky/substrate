import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { inlineArrowFunctions } from '../../../src/rules/v8/inlineArrowFunctions.js';
import scenarioGroups from './inlineArrowFunctions.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('inline-arrow-functions', () => {
  void it('validates inline-arrow-functions scenarios', () => {
    ruleTester.run('inline-arrow-functions', inlineArrowFunctions, scenarioGroups);
  });

  void it('covers guard exits and rebuilt-scope checks directly', () => {
    const reports: unknown[] = [];
    const listeners = inlineArrowFunctions.create({
      report(descriptor) {
        reports.push(descriptor);
      }
    } as never);

    listeners.ArrowFunctionExpression?.({
      body: { type: 'Identifier' },
      parent: { type: 'Property', parent: { type: 'ObjectExpression' } }
    } as never);

    listeners.ArrowFunctionExpression?.({
      body: { type: 'BlockStatement' },
      parent: { type: 'MethodDefinition', parent: { type: 'ClassBody' } }
    } as never);

    listeners.ArrowFunctionExpression?.({
      body: { type: 'BlockStatement' },
      parent: {
        parent: {
          parent: {
            type: 'FunctionDeclaration'
          },
          type: 'ObjectExpression'
        },
        type: 'Property'
      }
    } as never);

    assert.equal(reports.length, 1);

    listeners.ArrowFunctionExpression?.({
      body: { type: 'BlockStatement' },
      parent: {
        parent: {
          parent: {
            type: 'FunctionDeclaration'
          },
          type: 'ObjectExpression'
        },
        type: 'Property'
      }
    } as never);
  });
});
