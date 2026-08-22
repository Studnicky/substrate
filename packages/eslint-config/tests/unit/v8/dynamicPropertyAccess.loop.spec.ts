import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { dynamicPropertyAccess } from '../../../src/rules/v8/dynamicPropertyAccess.js';
import scenarioGroups from './dynamicPropertyAccess.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

// TYPE SERVICES ARE MANDATORY. `dynamic-property-access` decides whether the receiver
// is a plain object (report) or an indexed collection (exempt) by asking the
// TypeScript checker. With a bare `parserOptions: { sourceType: 'module' }` the checker
// is never built, the rule returns early for every node, and EVERY `invalid` scenario
// reports 0 errors — the suite fails wholesale rather than subtly, which is at least
// honest, but it proves nothing either way.
//
// Scenario code must also give receivers CONCRETE types via `declare const`. An
// untyped identifier resolves to `any`, and `any` is neither provably an array nor
// provably a plain object, so the exemption logic cannot be exercised.
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts']
      },
      tsconfigRootDir: repoRoot
    }
  }
});

void describe('dynamic-property-access', () => {
  void it('validates dynamic-property-access scenarios', () => {
    ruleTester.run('dynamic-property-access', dynamicPropertyAccess, scenarioGroups);
  });
});
