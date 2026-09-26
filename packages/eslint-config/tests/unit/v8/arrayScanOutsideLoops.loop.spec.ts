import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arrayScanOutsideLoops } from '../../../src/rules/v8/arrayScanOutsideLoops.js';
import scenarioGroups from './arrayScanOutsideLoops.scenarios.json' with { type: 'json' };

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

  void it('B1: scan inside a .forEach() callback is flagged', () => {
    ruleTester.run('array-scan-outside-loops', arrayScanOutsideLoops, {
      'invalid': [
        {
          'code': 'declare const recordGroups: number[][]; declare const id: number; recordGroups.forEach((records) => { records.find((r) => r === id); });',
          'errors': [{ 'messageId': 'forbidden' }],
          'name': 'find() inside a .forEach() callback is flagged'
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

  void it('covers remaining guard exits over real source', () => {
    ruleTester.run('array-scan-outside-loops', arrayScanOutsideLoops, {
      'invalid': [],
      'valid': [
        {
          'code': 'for (let index = 0; index < 10; index += 1) { foo(); }',
          'name': 'a bare identifier call inside a loop - not flagged (no MemberExpression callee to resolve)'
        },
        {
          'code': 'declare const records: number[]; for (let index = 0; index < 10; index += 1) { records[0](); }',
          'name': 'a computed literal-key call inside a loop - not flagged (key is not a scan-method name)'
        }
      ]
    });
  });
});
