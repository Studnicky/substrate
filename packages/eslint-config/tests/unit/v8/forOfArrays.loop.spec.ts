import { RuntimeError } from '@studnicky/errors/node';
import parser from '@typescript-eslint/parser';
import { Linter, RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { forOfArrays } from '../../../src/rules/v8/forOfArrays.js';
import scenarioFile from './forOfArrays.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts']
      },
      'tsconfigRootDir': repositoryRoot
    }
  }
});

/**
 * Wraps the real `@typescript-eslint/parser` so the returned `services.esTreeNodeToTSNodeMap`
 * never resolves the top-level `ForOfStatement.right` node — the one branch a genuinely typed
 * parse can't otherwise exercise, since the real parser always maps every node it produces.
 */
class UnresolvedTypeChecker {
  getTypeAtLocation(): object {
    const type = {};
    return type;
  }

  isArrayType(): boolean {
    const isArray = false;
    return isArray;
  }

  isTupleType(): boolean {
    const isTuple = false;
    return isTuple;
  }
}

class UnresolvedProgram {
  getTypeChecker(): UnresolvedTypeChecker {
    const checker = new UnresolvedTypeChecker();
    return checker;
  }
}

class UnresolvedTsNodeParser {
  static parseForESLint(text: string, options?: Parameters<typeof parser.parseForESLint>[1]) {
    const real = parser.parseForESLint(text, options);
    const statement = real.ast.body.find((candidate) => {
      const matches = candidate.type === 'ForOfStatement';
      return matches;
    });

    if (statement === undefined) {
      throw RuntimeError.create('expected a ForOfStatement somewhere in the program');
    }

    const result = {
      'ast': real.ast,
      'scopeManager': real.scopeManager,
      'services': {
        'esTreeNodeToTSNodeMap': new Map(),
        'program': new UnresolvedProgram()
      }
    };
    return result;
  }
}

const unresolvedTsNodeParser = { 'parseForESLint': UnresolvedTsNodeParser.parseForESLint };

void describe('for-of-arrays', () => {
  void it('validates for-of-arrays source scenarios', () => {
    ruleTester.run('for-of-arrays', forOfArrays, scenarioFile.ruleTester);
  });

  void it('ignores non-arrays when type services do not resolve a TS node for the right-hand side', () => {
    const linter = new Linter();
    const messages = linter.verify('declare const arr: number[]; for (const x of arr) { void x; }', [{
      'files': ['**/*.ts'],
      'languageOptions': { 'parser': unresolvedTsNodeParser },
      'plugins': { 'local': { 'rules': { 'for-of-arrays': forOfArrays } } },
      'rules': { 'local/for-of-arrays': 'error' }
    }], { 'filename': 'unresolved.ts' });

    assert.deepEqual(messages, []);
  });
});
