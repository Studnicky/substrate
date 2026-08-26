import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { Rule } from 'eslint';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { regexpInLoops } from '../../../src/rules/v8/regexpInLoops.js';
import { ObjectGuard } from '../../../src/rules/shared/ObjectGuard.js';
import scenarioGroups from './regexpInLoops.scenarios.json' with { type: 'json' };

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

void describe('regexp-in-loops', () => {
  void it('validates regexp-in-loops scenarios', () => {
    ruleTester.run('regexp-in-loops', regexpInLoops, scenarioGroups);
  });

  void it('ignores malformed RegExp callee shapes', () => {
    const reports: unknown[] = [];
    const listeners = regexpInLoops.create({
      report(descriptor: unknown) {
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

    // `Literal[regex]` is an esquery selector, not a node-type key, so `@types/eslint` resolves
    // it through `Rule.RuleListener`'s catch-all index signature rather than through
    // `NodeListener`. That index signature is a UNION of handler shapes with differing arities —
    // a plain node visitor takes 1 argument, `onCodePathSegmentLoop` takes 3. Calling a
    // union-typed function requires an argument list valid for every member of the union, so
    // TypeScript demands 3 arguments (TS2554) even though every selector visitor receives
    // exactly one node. Optional chaining does not help: the failure is the call signature, not
    // nullability.
    //
    // Narrowing to the single-node signature at the access point is what makes the call
    // expressible. This widens nothing — `regexpInLoops.create` returns `onLiteral`, whose real
    // signature is `(node: Rule.Node) => void`, so the annotation states the true shape rather
    // than relaxing it. Do not "simplify" this back to a direct indexed call; it will not compile.
    const onRegexLiteral = listeners['Literal[regex]'] as ((node: Rule.Node) => void) | undefined;

    onRegexLiteral?.({
      type: 'Literal',
      regex: undefined
    } as never);

    assert.deepEqual(reports.map(toMessageId), []);
  });
});
