import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

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

const repoRoot = resolve(import.meta.dirname, '../../../..');

// `projectService`/`tsconfigRootDir` (not bare `sourceType: 'module'`) is required
// here: the redesigned rule resolves `.forEach` and other per-element iteration
// methods through `CallIdentity`, which needs a real type checker. Without type
// services `CallIdentity.isBuiltinCall` always returns `false` (see its own
// module comment), so any scenario relying on it would silently pass with zero
// errors regardless of what the rule actually does — a vacuous test.
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
