import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { prototypeModification } from '../../../src/rules/v8/prototypeModification.js';
import scenarioGroups from './prototypeModification.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('prototype-modification', () => {
  void it('validates prototype-modification scenarios', () => {
    ruleTester.run('prototype-modification', prototypeModification, scenarioGroups);
  });
});
