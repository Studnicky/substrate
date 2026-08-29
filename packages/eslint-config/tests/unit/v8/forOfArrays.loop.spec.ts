import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import { forOfArrays } from '../../../src/rules/v8/forOfArrays.js';
import { Predicates } from '@studnicky/types';
import scenarioFile from './forOfArrays.scenarios.json' with { type: 'json' };

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
  readonly shape: string;
}

interface RightInput {
  readonly shape: string;
}

interface ListenerScenario {
  readonly expected: {
    readonly messageIds: readonly string[];
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
  },
  // Regression fixture for the WeakMap-vs-Map bug: the real installed
  // @typescript-eslint/parser exposes `esTreeNodeToTSNodeMap` as a WeakMap under
  // projectService/allowDefaultProject, so `instanceof Map` is always false there.
  // hasTypeServices must duck-type on `.get()` instead, which this WeakMap-backed
  // fixture exercises directly (a WeakMap cannot be constructed from entries, so the
  // single right-hand-side object is set individually).
  typedWeakMap: (input, right) => {
    const tsNode = {};
    const map = new WeakMap();
    if (input.hasTsNode !== false) { map.set(right, tsNode); }

    return {
      esTreeNodeToTSNodeMap: map,
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

function requireFixtureFactory<T>(factory: T | undefined, shape: string): T {
  if (factory === undefined) {
    throw RuntimeError.create(`Unsupported scenario fixture shape: ${shape}`);
  }
  return factory;
}

function toMessageId(report: unknown): string {
  if (!Predicates.isRecord(report)) { return '<no-messageId>'; }
  const { messageId } = report;
  return typeof messageId === 'string' ? messageId : '<no-messageId>';
}

void describe('for-of-arrays', () => {
  void it('validates for-of-arrays source scenarios', () => {
    ruleTester.run('for-of-arrays', forOfArrays, scenarioFile.ruleTester);
  });

  for (const scenarioCase of scenarioFile.listenerCases as readonly ListenerScenario[]) {
    void it(scenarioCase.name, () => {
      const reports: unknown[] = [];
      const rightFactory = requireFixtureFactory(
        rightFactories[scenarioCase.input.right.shape],
        scenarioCase.input.right.shape
      );
      const right = rightFactory(scenarioCase.input.right);
      const parserServicesFactory = requireFixtureFactory(
        parserServicesFactories[scenarioCase.input.parserServices.shape],
        scenarioCase.input.parserServices.shape
      );
      const listeners = forOfArrays.create({
        report(descriptor: unknown) {
          reports.push(descriptor);
        },
        sourceCode: {
          parserServices: parserServicesFactory(scenarioCase.input.parserServices, right)
        }
      } as never);

      listeners.ForOfStatement?.({
        right
      } as never);

      assert.deepEqual(reports.map(toMessageId), scenarioCase.expected.messageIds);
    });
  }
});
