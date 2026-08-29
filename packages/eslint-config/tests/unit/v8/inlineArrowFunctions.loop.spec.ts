import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { inlineArrowFunctions } from '../../../src/rules/v8/inlineArrowFunctions.js';
import { Predicates } from '@studnicky/types';
import scenarioGroups from './inlineArrowFunctions.scenarios.json' with { type: 'json' };

function toMessageId(report: unknown): string {
  if (!Predicates.isRecord(report)) { return '<no-messageId>'; }
  const { messageId } = report;
  return typeof messageId === 'string' ? messageId : '<no-messageId>';
}

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

// `projectService`/`tsconfigRootDir` (not bare `sourceType: 'module'`) is required
// here: the redesigned rule resolves `.forEach` and other per-element iteration
// methods through `CallIdentity` (via the shared `InlineCallablePosition`/
// `LoopContext`), which needs a real type checker. Without type services
// `CallIdentity.isBuiltinCall` always returns `false`, so any scenario relying
// on it would silently pass with zero errors regardless of what the rule
// actually does — a vacuous test.
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

    // Single-statement BlockStatement body short-circuits on the statement-count
    // gate before any position check runs.
    listeners.ArrowFunctionExpression?.({
      body: { body: [{ type: 'ReturnStatement' }], type: 'BlockStatement' },
      parent: { type: 'Property', parent: { type: 'ObjectExpression' } }
    } as never);

    // Multi-statement BlockStatement body, but the containing shape matches none
    // of the recognized rebuilt-per-call/iteration positions.
    listeners.ArrowFunctionExpression?.({
      body: { body: [{ type: 'ExpressionStatement' }, { type: 'ReturnStatement' }], type: 'BlockStatement' },
      parent: { type: 'MethodDefinition', parent: { type: 'ClassBody' } }
    } as never);

    assert.deepEqual(reports.map(toMessageId), []);
  });
});
