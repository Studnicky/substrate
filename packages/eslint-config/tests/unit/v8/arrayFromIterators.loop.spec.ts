import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import { arrayFromIterators } from '../../../src/rules/v8/arrayFromIterators.js';
import { ObjectGuard } from '../../../src/rules/shared/ObjectGuard.js';
import scenarioFile from './arrayFromIterators.scenarios.json';

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

interface CalleeInput {
  readonly shape: string;
}

interface FirstArgumentInput {
  readonly constructorName?: string;
  readonly shape: string;
}

interface ParentInput {
  readonly shape: string;
  readonly nodeType?: string;
}

interface ParserServicesInput {
  readonly hasTsNode?: boolean;
  readonly isArrayType?: boolean;
  readonly shape: string;
}

interface ListenerScenario {
  readonly expected: {
    readonly messageIds: readonly string[];
  };
  readonly input: {
    readonly callExpression: {
      readonly callee: CalleeInput;
      readonly firstArgument: FirstArgumentInput;
      readonly parent: ParentInput;
    };
    readonly parserServices: ParserServicesInput;
  };
  readonly name: string;
}

type CalleeFactory = (input: CalleeInput) => unknown;
type FirstArgumentFactory = (input: FirstArgumentInput, trackedArgument: object) => unknown;
type ParentFactory = (input: ParentInput) => unknown;
type ParserServicesFactory = (input: ParserServicesInput, firstArgument: unknown) => unknown;

const calleeFactories: Record<string, CalleeFactory> = {
  arrayFrom: () => ({
    object: { name: 'Array', type: 'Identifier' },
    property: { name: 'from', type: 'Identifier' },
    type: 'MemberExpression'
  }),
  nullish: () => null
};

const firstArgumentFactories: Record<string, FirstArgumentFactory> = {
  newExpression: (input) => ({
    callee: { name: input.constructorName, type: 'Identifier' },
    type: 'NewExpression'
  }),
  plainObject: () => ({}),
  tracked: (_input, trackedArgument) => trackedArgument
};

const parentFactories: Record<string, ParentFactory> = {
  none: () => undefined,
  node: (input) => ({ type: input.nodeType })
};

const parserServicesFactories: Record<string, ParserServicesFactory> = {
  empty: () => ({}),
  typed: (input, firstArgument) => {
    const tsNode = {};
    const entries = input.hasTsNode === false ? [] : [[firstArgument, tsNode] as const];

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
            }
          };
        }
      }
    };
  }
};

function requireFixtureFactory<T>(factory: T | undefined, shape: string): T {
  assert.notEqual(factory, undefined, `Unsupported scenario fixture shape: ${shape}`);
  return factory;
}

function toMessageId(report: unknown): string {
  if (!ObjectGuard.isObject(report)) { return '<no-messageId>'; }
  const { messageId } = report;
  return typeof messageId === 'string' ? messageId : '<no-messageId>';
}

void describe('array-from-iterators', () => {
  void it('validates array-from-iterators source scenarios', () => {
    ruleTester.run('array-from-iterators', arrayFromIterators, scenarioFile.ruleTester);
  });

  for (const scenarioCase of scenarioFile.listenerCases as readonly ListenerScenario[]) {
    void it(scenarioCase.name, () => {
      const reports: unknown[] = [];
      const trackedArgument = {};
      const firstArgumentFactory = requireFixtureFactory(
        firstArgumentFactories[scenarioCase.input.callExpression.firstArgument.shape],
        scenarioCase.input.callExpression.firstArgument.shape
      );
      const firstArgument = firstArgumentFactory(
        scenarioCase.input.callExpression.firstArgument,
        trackedArgument
      );
      const calleeFactory = requireFixtureFactory(
        calleeFactories[scenarioCase.input.callExpression.callee.shape],
        scenarioCase.input.callExpression.callee.shape
      );
      const parentFactory = requireFixtureFactory(
        parentFactories[scenarioCase.input.callExpression.parent.shape],
        scenarioCase.input.callExpression.parent.shape
      );
      const parserServicesFactory = requireFixtureFactory(
        parserServicesFactories[scenarioCase.input.parserServices.shape],
        scenarioCase.input.parserServices.shape
      );
      const listeners = arrayFromIterators.create({
        report(descriptor) {
          reports.push(descriptor);
        },
        sourceCode: {
          parserServices: parserServicesFactory(
            scenarioCase.input.parserServices,
            firstArgument
          )
        }
      } as never);

      listeners.CallExpression?.({
        arguments: [firstArgument],
        callee: calleeFactory(scenarioCase.input.callExpression.callee),
        parent: parentFactory(scenarioCase.input.callExpression.parent),
        type: 'CallExpression'
      } as never);

      assert.deepEqual(reports.map(toMessageId), scenarioCase.expected.messageIds);
    });
  }
});
