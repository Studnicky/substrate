import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import { forOfArrays } from '../../../src/rules/v8/forOfArrays.js';
import scenarioFile from './forOfArrays.scenarios.json';

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

interface ParserServicesInput {
  readonly hasTsNode?: boolean;
  readonly isArrayType?: boolean;
  readonly isTupleType?: boolean;
  readonly kind: string;
}

interface RightInput {
  readonly kind: string;
}

interface ListenerScenario {
  readonly expected: {
    readonly reportCount: number;
  };
  readonly input: {
    readonly parserServices: ParserServicesInput;
    readonly right: RightInput;
  };
  readonly name: string;
}

type ParserServicesFactory = (input: ParserServicesInput, right: object) => unknown;
type RightFactory = (input: RightInput) => object;

const parserServicesFactories: Record<string, ParserServicesFactory> = {
  empty: () => ({}),
  typed: (input, right) => {
    const tsNode = {};
    const entries = input.hasTsNode === false ? [] : [[right, tsNode] as const];

    return {
      esTreeNodeToTSNodeMap: new Map(entries),
      program: {
        getTypeChecker() {
          return {
            getTypeAtLocation() {
              return {};
            },
            isArrayType() {
              return input.isArrayType === true;
            },
            isTupleType() {
              return input.isTupleType === true;
            }
          };
        }
      }
    };
  }
};

const rightFactories: Record<string, RightFactory> = {
  arrayExpression: () => ({ type: 'ArrayExpression' }),
  object: () => ({})
};

function requireFixtureFactory<T>(factory: T | undefined, kind: string): T {
  assert.notEqual(factory, undefined, `Unsupported scenario fixture kind: ${kind}`);
  return factory;
}

void describe('for-of-arrays', () => {
  void it('validates for-of-arrays source scenarios', () => {
    ruleTester.run('for-of-arrays', forOfArrays, scenarioFile.ruleTester);
  });

  for (const scenarioCase of scenarioFile.listenerCases as readonly ListenerScenario[]) {
    void it(scenarioCase.name, () => {
      const reports: unknown[] = [];
      const rightFactory = requireFixtureFactory(
        rightFactories[scenarioCase.input.right.kind],
        scenarioCase.input.right.kind
      );
      const right = rightFactory(scenarioCase.input.right);
      const parserServicesFactory = requireFixtureFactory(
        parserServicesFactories[scenarioCase.input.parserServices.kind],
        scenarioCase.input.parserServices.kind
      );
      const listeners = forOfArrays.create({
        report(descriptor) {
          reports.push(descriptor);
        },
        sourceCode: {
          parserServices: parserServicesFactory(scenarioCase.input.parserServices, right)
        }
      } as never);

      listeners.ForOfStatement?.({
        right
      } as never);

      assert.equal(reports.length, scenarioCase.expected.reportCount);
    });
  }
});
