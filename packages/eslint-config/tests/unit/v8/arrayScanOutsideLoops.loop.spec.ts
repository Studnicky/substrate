import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arrayScanOutsideLoops } from '../../../src/rules/v8/arrayScanOutsideLoops.js';
import { Predicates } from '@studnicky/types';
import scenarioGroups from './arrayScanOutsideLoops.scenarios.json' with { type: 'json' };

function toMessageId(report: unknown): string {
  if (!Predicates.isRecord(report)) { return '<no-messageId>'; }
  const { messageId } = report;
  return typeof messageId === 'string' ? messageId : '<no-messageId>';
}

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

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

void describe('array-scan-outside-loops', () => {
  void it('validates array-scan-outside-loops scenarios', () => {
    ruleTester.run('array-scan-outside-loops', arrayScanOutsideLoops, scenarioGroups);
  });

  // B1: identity is now resolved via `CallIdentity`/`checker.getResolvedSignature`
  // rather than a hand-rolled `callee.property.name` check, so the branches below are
  // exercised through real source over the RuleTester instead of a hand-mocked
  // `parserServices` object shaped for the previous implementation's internals.
  void it('B1: computed-key and const-held-key scan calls resolve identically to the plain call', () => {
    ruleTester.run('array-scan-outside-loops', arrayScanOutsideLoops, {
      'invalid': [
        {
          'code': 'declare const records: number[]; declare const ids: number[]; for (const id of ids) { records[\'find\']((r) => r === id); }',
          'errors': [{ 'messageId': 'forbidden' }],
          'name': 'computed string-literal key find() inside a loop - flagged'
        },
        {
          'code': 'declare const records: number[]; declare const ids: number[]; const FIND = \'find\' as const; for (const id of ids) { records[FIND]((r) => r === id); }',
          'errors': [{ 'messageId': 'forbidden' }],
          'name': 'const-held computed key find() inside a loop - flagged'
        }
      ],
      'valid': []
    });
  });

  void it('B1: PER-ITERATION IS RESOLVED VIA LoopContext: scan inside a .forEach() callback is flagged', () => {
    ruleTester.run('array-scan-outside-loops', arrayScanOutsideLoops, {
      'invalid': [
        {
          'code': 'declare const recordGroups: number[][]; declare const id: number; recordGroups.forEach((records) => { records.find((r) => r === id); });',
          'errors': [{ 'messageId': 'forbidden' }],
          'name': 'find() inside a .forEach() callback - flagged (FunctionScope.isInsideLoop stopped at the callback boundary and missed this)'
        }
      ],
      'valid': []
    });
  });

  void it('B1: a same-named method on an unrelated class is not flagged', () => {
    ruleTester.run('array-scan-outside-loops', arrayScanOutsideLoops, {
      'invalid': [],
      'valid': [
        {
          'code': 'class Rope { find(pred: (x: number) => boolean): number | undefined { void pred; return undefined; } } declare const acc: Rope; declare const ids: number[]; for (const id of ids) { acc.find((r) => r === id); }',
          'name': 'same-named `Rope.find` on an unrelated class - not flagged (CallIdentity requires the Array/ReadonlyArray origin, not just the name)'
        }
      ]
    });
  });

  void it('covers remaining guard exits directly', () => {
    const reports: unknown[] = [];
    const listeners = arrayScanOutsideLoops.create({
      report(descriptor: unknown) {
        reports.push(descriptor);
      },
      sourceCode: {
        getScope() {
          return {
            upper: null,
            variables: []
          };
        },
        parserServices: {}
      }
    } as never);

    listeners.CallExpression?.({
      callee: { type: 'Identifier' },
      parent: { parent: null, type: 'Program' },
      type: 'CallExpression'
    } as never);

    listeners.CallExpression?.({
      callee: {
        object: { type: 'Identifier', name: 'records' },
        property: { type: 'Literal' },
        type: 'MemberExpression'
      },
      parent: { parent: null, type: 'Program' },
      type: 'CallExpression'
    } as never);

    listeners.CallExpression?.({
      callee: {
        object: { type: 'Identifier', name: 'records' },
        property: { type: 'Identifier', name: 'find' },
        type: 'MemberExpression'
      },
      parent: { parent: null, type: 'Program' },
      type: 'CallExpression'
    } as never);

    assert.deepEqual(reports.map(toMessageId), []);
  });
});
