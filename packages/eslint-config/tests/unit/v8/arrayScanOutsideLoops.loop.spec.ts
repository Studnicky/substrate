import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arrayScanOutsideLoops } from '../../../src/rules/v8/arrayScanOutsideLoops.js';
import scenarioGroups from './arrayScanOutsideLoops.scenarios.json';

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

  void it('covers loop-local and parser-service branches directly', () => {
    const makeListener = (context: unknown) => arrayScanOutsideLoops.create(context as never).CallExpression as NonNullable<ReturnType<typeof arrayScanOutsideLoops.create>['CallExpression']>;

    const noReports: unknown[] = [];
    const reportContext = {
      report(descriptor: unknown) {
        noReports.push(descriptor);
      },
      sourceCode: {
        getScope() {
          return {
            upper: null,
            variables: [
              {
                defs: [{ node: { range: [12, 22] } }],
                name: 'inner'
              }
            ]
          };
        },
        parserServices: {}
      }
    };

    makeListener(reportContext)({
      callee: {
        object: { type: 'Identifier', name: 'inner' },
        property: { type: 'Identifier', name: 'find' },
        type: 'MemberExpression'
      },
      parent: {
        type: 'ForOfStatement',
        range: [0, 30]
      },
      type: 'CallExpression'
    } as never);

    assert.equal(noReports.length, 0);

    const typedReports: unknown[] = [];
    const typedReceiver = { type: 'Identifier', name: 'records' };
    const typedContext = {
      report(descriptor: unknown) {
        typedReports.push(descriptor);
      },
      sourceCode: {
        getScope() {
          return {
              upper: null,
              variables: []
            };
          },
          parserServices: {
          esTreeNodeToTSNodeMap: new Map([[typedReceiver, {}]]),
          program: {
            getTypeChecker() {
              return {
                getTypeAtLocation() {
                  return {};
                },
                isArrayType() {
                  return true;
                },
                isTupleType() {
                  return false;
                }
              };
            }
          }
        }
      }
    };

    makeListener(typedContext)({
      callee: {
        object: typedReceiver,
        property: { type: 'Identifier', name: 'find' },
        type: 'MemberExpression'
      },
      parent: {
        type: 'ForStatement',
        range: [0, 40]
      },
      type: 'CallExpression'
    } as never);

    assert.equal(typedReports.length, 1);

    const typedNoReportContext = {
      report(descriptor: unknown) {
        typedReports.push(descriptor);
      },
      sourceCode: {
        getScope() {
          return {
            upper: null,
            variables: []
          };
        },
        parserServices: {
          esTreeNodeToTSNodeMap: new Map([[typedReceiver, {}]]),
          program: {
            getTypeChecker() {
              return {
                getTypeAtLocation() {
                  return {};
                },
                isArrayType() {
                  return false;
                },
                isTupleType() {
                  return false;
                }
              };
            }
          }
        }
      }
    };

    makeListener(typedNoReportContext)({
      callee: {
        object: typedReceiver,
        property: { type: 'Identifier', name: 'find' },
        type: 'MemberExpression'
      },
      parent: {
        type: 'WhileStatement',
        range: [0, 40]
      },
      type: 'CallExpression'
    } as never);

    assert.equal(typedReports.length, 1);
  });

  void it('covers remaining guard exits directly', () => {
    const reports: unknown[] = [];
    const listeners = arrayScanOutsideLoops.create({
      report(descriptor) {
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

    assert.equal(reports.length, 0);
  });
});
