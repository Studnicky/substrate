import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { Context } from '../../../src/context/index.js';
import type { ContextConfigEntity } from '../../../src/entities/ContextConfigEntity.js';
import scenarioGroups from './ContextScope.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'active-on-construction'
  | 'async-accumulates-state'
  | 'async-execute-errors-propagate'
  | 'complex-object-values'
  | 'delete-affects-later-executes'
  | 'empty-string-key'
  | 'execute-errors-propagate'
  | 'function-values'
  | 'immediate-terminate-empty'
  | 'immediate-terminate-with-values'
  | 'independent-key-sets'
  | 'long-key-name'
  | 'many-keys'
  | 'middleware-chain-pattern'
  | 'multi-execute-before-terminate'
  | 'mutations-in-one-scope-not-others'
  | 'mutations-visible-after-await'
  | 'nested-async-functions'
  | 'null-values'
  | 'overwrite-later-values'
  | 'parallel-operations-pattern'
  | 'persist-values-across-executes'
  | 'prevent-execute-after-terminate'
  | 'promise-all-propagation'
  | 'promise-resolve-propagation'
  | 'request-handling-pattern'
  | 'scope-reusable-after-error'
  | 'separate-scopes-isolated'
  | 'snapshot-clears-store'
  | 'snapshot-complete'
  | 'snapshot-independent-copy'
  | 'symbol-key-string'
  | 'terminate-after-error'
  | 'terminate-once'
  | 'terminated-scope-throws'
  | 'timeout-propagation'
  | 'undefined-values';

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: {
    context: unknown;
    scope?: Record<string, unknown>;
  };
  shape: string;
  name: string;
};

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;
type FunctionFixtureName = 'doubleNumber';
type FunctionFixture = (num: number) => number;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be an object`);
  }

  return value;
}

function contextConfig(scenarioCase: ScenarioCase): ContextConfigEntity.Type {
  const context = requireRecord(scenarioCase.input.context, 'input.context');
  const name = context.name;
  if (typeof name !== 'string') {
    throw new TypeError('input.context.name must be a string');
  }

  return { name };
}

function scopeInput(scenarioCase: ScenarioCase): Record<string, unknown> {
  return scenarioCase.input.scope === undefined
    ? {}
    : requireRecord(scenarioCase.input.scope, 'input.scope');
}

function scopeInitial(scenarioCase: ScenarioCase): Record<string, unknown> | undefined {
  const initial = scopeInput(scenarioCase).initial;
  return initial === undefined
    ? undefined
    : requireRecord(initial, 'input.scope.initial');
}

function scopeString(scenarioCase: ScenarioCase, key: string): string {
  const value = scopeInput(scenarioCase)[key];
  if (typeof value !== 'string') {
    throw new TypeError(`input.scope.${key} must be a string`);
  }

  return value;
}

function scopeNumber(scenarioCase: ScenarioCase, key: string): number {
  const value = scopeInput(scenarioCase)[key];
  if (typeof value !== 'number') {
    throw new TypeError(`input.scope.${key} must be a number`);
  }

  return value;
}

function scopeBoolean(scenarioCase: ScenarioCase, key: string): boolean {
  const value = scopeInput(scenarioCase)[key];
  if (typeof value !== 'boolean') {
    throw new TypeError(`input.scope.${key} must be a boolean`);
  }

  return value;
}

function scopeInitialArray(scenarioCase: ScenarioCase): Record<string, unknown>[] {
  const value = scopeInput(scenarioCase).initial;
  if (!Array.isArray(value)) {
    throw new TypeError('input.scope.initial must be an array');
  }

  return value.map((entry, index) => requireRecord(entry, `input.scope.initial[${index}]`));
}

function scopeNumberArray(scenarioCase: ScenarioCase, key: string): number[] {
  const value = scopeInput(scenarioCase)[key];
  if (!Array.isArray(value)) {
    throw new TypeError(`input.scope.${key} must be an array`);
  }

  const numbers: number[] = [];
  for (const item of value) {
    if (typeof item !== 'number') {
      throw new TypeError(`input.scope.${key} must contain only numbers`);
    }
    numbers.push(item);
  }

  return numbers;
}

function expectedStringArray(scenarioCase: ScenarioCase, key: string): string[] {
  const value = scenarioCase.expected[key];
  if (!Array.isArray(value)) {
    throw new TypeError(`expected.${key} must be an array`);
  }

  const strings: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new TypeError(`expected.${key} must contain only strings`);
    }
    strings.push(item);
  }

  return strings;
}

function createContext(scenarioCase: ScenarioCase): Context {
  return Context.create(contextConfig(scenarioCase));
}

const functionFixtureMap = {
  doubleNumber: (num: number): number => num * 2
} satisfies Record<FunctionFixtureName, FunctionFixture>;

function isFunctionFixtureName(value: string): value is FunctionFixtureName {
  return Object.hasOwn(functionFixtureMap, value);
}

function scopeFunctionFixture(scenarioCase: ScenarioCase, key: string): FunctionFixture {
  const initial = scopeInitial(scenarioCase);
  if (initial === undefined) {
    throw new TypeError('input.scope.initial must be an object');
  }
  const value = initial[key];
  if (typeof value !== 'string') {
    throw new TypeError(`input.scope.initial.${key} must be a string`);
  }

  if (!isFunctionFixtureName(value)) {
    throw new TypeError(`input.scope.initial.${key} must reference a known function fixture`);
  }

  return functionFixtureMap[value];
}

const runnerMap = {
  'active-on-construction': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const result = scope.execute(() => context.get('key'));
    assert.strictEqual(result, scenarioCase.expected.result);
    return;
  },

  'multi-execute-before-terminate': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const executionInput = scopeInput(scenarioCase).executions;
    if (!Array.isArray(executionInput)) {
      throw new TypeError('input.scope.executions must be an array');
    }
    const executions: unknown[] = [];
    for (const execution of executionInput) {
      scope.execute(() => { executions.push(execution); });
    }
    assert.deepStrictEqual(executions, scenarioCase.expected.executions);
    return;
  },

  'terminated-scope-throws': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.terminate();
    assert.strictEqual(scopeString(scenarioCase, 'message'), scenarioCase.expected.message);
    assert.throws(() => scope.execute(() => {}), { message: scenarioCase.expected.message });
    return;
  },

  'terminate-once': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.terminate();
    assert.strictEqual(scopeString(scenarioCase, 'message'), scenarioCase.expected.message);
    assert.throws(() => scope.terminate(), { message: scopeString(scenarioCase, 'message') });
    return;
  },

  'persist-values-across-executes': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const fromFirst = scopeString(scenarioCase, 'fromFirst');
    const fromSecond = scopeString(scenarioCase, 'fromSecond');
    scope.execute(() => { context.set('fromFirst', fromFirst); });
    scope.execute(() => {
      assert.strictEqual(context.get('fromFirst'), fromFirst);
      context.set('fromSecond', fromSecond);
    });
    assert.deepStrictEqual(scope.terminate(), scenarioCase.expected.terminate);
    return;
  },

  'overwrite-later-values': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => { context.set('counter', 1); });
    scope.execute(() => { context.set('counter', 2); });
    scope.execute(() => { context.set('counter', scenarioCase.expected.counter); });
    assert.strictEqual(scope.terminate().counter, scenarioCase.expected.counter);
    return;
  },

  'delete-affects-later-executes': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => { context.delete('remove'); });
    scope.execute(() => {
      assert.strictEqual(context.has('keep'), true);
      assert.strictEqual(context.has('remove'), false);
    });
    assert.deepStrictEqual(scope.terminate(), scenarioCase.expected.terminate);
    return;
  },

  'async-accumulates-state': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    return scope.execute(async () => {
      await setTimeout(5);
      context.set('step', 1);
      context.set('async1', 'done');
    }).then(() => scope.execute(async () => {
      await setTimeout(5);
      assert.strictEqual(context.get('step'), 1);
      context.set('step', 2);
      context.set('async2', 'done');
    })).then(() => {
      assert.deepStrictEqual(scope.terminate(), scenarioCase.expected.terminate);
    });
  },

  'promise-resolve-propagation': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    return scope.execute(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(context.get('id'), scenarioCase.expected.id);
    });
  },

  'timeout-propagation': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    return scope.execute(async () => {
      await setTimeout(10);
      assert.strictEqual(context.get('id'), scenarioCase.expected.id);
      await setTimeout(10);
      assert.strictEqual(context.get('id'), scenarioCase.expected.id);
    });
  },

  'promise-all-propagation': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    return scope.execute(async () => {
      const results = await Promise.all([
        Promise.resolve().then(() => context.get('id')),
        setTimeout(5).then(() => context.get('id')),
        setTimeout(10).then(() => context.get('id'))
      ]);
      assert.deepStrictEqual(results, scenarioCase.expected.results);
    });
  },

  'nested-async-functions': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    async function level3(): Promise<void> {
      assert.strictEqual(context.get('depth'), 2);
      context.set('depth', scenarioCase.expected.finalDepth);
    }
    async function level2(): Promise<void> {
      assert.strictEqual(context.get('depth'), 1);
      context.set('depth', 2);
      await setTimeout(5);
      await level3();
    }
    async function level1(): Promise<void> {
      context.set('depth', 1);
      await setTimeout(5);
      await level2();
    }
    return scope.execute(async () => {
      await level1();
      assert.strictEqual(context.get('depth'), scenarioCase.expected.finalDepth);
    });
  },

  'mutations-visible-after-await': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const before = scopeBoolean(scenarioCase, 'before');
    const after = scopeBoolean(scenarioCase, 'after');
    return scope.execute(async () => {
      context.set('before', before);
      await setTimeout(10);
      assert.strictEqual(context.get('before'), before);
      context.set('after', after);
    }).then(() => {
      assert.deepStrictEqual(scope.terminate(), scenarioCase.expected.terminate);
    });
  },

  'separate-scopes-isolated': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const initial = scopeInitialArray(scenarioCase);
    const scope1 = context.initialize(initial[0]);
    const scope2 = context.initialize(initial[1]);
    const scope3 = context.initialize(initial[2]);
    const results: string[] = [];
    return Promise.all([
      scope1.execute(async () => { await setTimeout(15); results.push(`1:${context.get('id')}`); }),
      scope2.execute(async () => { await setTimeout(10); results.push(`2:${context.get('id')}`); }),
      scope3.execute(async () => { await setTimeout(5); results.push(`3:${context.get('id')}`); })
      ]).then(() => {
        for (const result of expectedStringArray(scenarioCase, 'contains')) {
          assert.ok(results.includes(result));
        }
      });
  },

  'mutations-in-one-scope-not-others': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope1 = context.initialize(scopeInitial(scenarioCase));
    const scope2 = context.initialize(scopeInitial(scenarioCase));
    return Promise.all([
      scope1.execute(async () => {
        context.set('value', scenarioCase.expected.scope1);
        await setTimeout(20);
        assert.strictEqual(context.get('value'), scenarioCase.expected.scope1);
      }),
      scope2.execute(async () => {
        await setTimeout(10);
        assert.strictEqual(context.get('value'), scopeInitial(scenarioCase)?.value);
        context.set('value', scenarioCase.expected.scope2);
      })
    ]).then(() => {
      assert.strictEqual(scope1.terminate().value, scenarioCase.expected.scope1);
      assert.strictEqual(scope2.terminate().value, scenarioCase.expected.scope2);
    });
  },

  'independent-key-sets': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope1 = context.initialize(scopeInitial(scenarioCase));
    const scope2 = context.initialize(scopeInitial(scenarioCase));
    return Promise.all([
      scope1.execute(async () => {
        context.set('only1', 'value1');
        await setTimeout(10);
      }),
      scope2.execute(async () => {
        context.set('only2', 'value2');
        await setTimeout(10);
      })
    ]).then(() => {
      const final1 = scope1.terminate();
      const final2 = scope2.terminate();
      assert.ok('only1' in final1);
      assert.ok(!('only2' in final1));
      assert.ok('only2' in final2);
      assert.ok(!('only1' in final2));
    });
  },

  'snapshot-complete': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const expectedSnapshot = requireRecord(scenarioCase.expected.snapshot, 'expected.snapshot');
    scope.execute(() => {
      context.set('added1', expectedSnapshot.added1);
      context.set('added2', expectedSnapshot.added2);
    });
    assert.deepStrictEqual(scope.terminate(), expectedSnapshot);
    return;
  },

  'snapshot-clears-store': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    assert.strictEqual(scope.terminate().key, scenarioCase.expected.first);
    assert.throws(() => scope.terminate(), { message: `${context.name} scope has already been terminated` });
    return;
  },

  'snapshot-independent-copy': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const initial = scopeInitial(scenarioCase);
    if (initial === undefined) {
      throw new TypeError('input.scope.initial must be an object');
    }
    const obj = { ...requireRecord(initial.obj, 'input.scope.initial.obj') };
    const scope = context.initialize({ obj });
    const final = scope.terminate();
    obj.nested = String(scenarioCase.expected.nested);
    assert.strictEqual(requireRecord(final.obj, 'final.obj').nested, scenarioCase.expected.nested);
    return;
  },

  'prevent-execute-after-terminate': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.terminate();
    assert.strictEqual(scopeString(scenarioCase, 'message'), scenarioCase.expected.message);
    assert.throws(() => scope.execute(() => {}), { message: scopeString(scenarioCase, 'message') });
    return;
  },

  'immediate-terminate-with-values': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    assert.deepStrictEqual(scope.terminate(), scenarioCase.expected.terminate);
    return;
  },

  'immediate-terminate-empty': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    assert.deepStrictEqual(scopeInput(scenarioCase).terminate, scenarioCase.expected.terminate);
    assert.deepStrictEqual(scope.terminate(), scenarioCase.expected.terminate);
    return;
  },

  'execute-errors-propagate': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const message = scopeString(scenarioCase, 'message');
    assert.strictEqual(message, scenarioCase.expected.message);
    assert.throws(() => scope.execute(() => { throw new Error(message); }), { message });
    return;
  },

  'async-execute-errors-propagate': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const message = scopeString(scenarioCase, 'message');
    assert.strictEqual(message, scenarioCase.expected.message);
    return scope.execute(async () => {
      await setTimeout(5);
      throw new Error(message);
    }).then(() => {
      throw new Error('Should have thrown');
    }, (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.strictEqual(error.message, message);
    });
  },

  'scope-reusable-after-error': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    try {
      scope.execute(() => {
        context.set('beforeError', true);
        throw new Error('oops');
      });
    } catch {
      // ignore
    }
    scope.execute(() => {
      assert.strictEqual(context.get('beforeError'), true);
      context.set('afterError', scenarioCase.expected.afterError);
    });
    assert.strictEqual(scope.terminate().afterError, scenarioCase.expected.afterError);
    return;
  },

  'terminate-after-error': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    try {
      scope.execute(() => { throw new Error('error'); });
    } catch {
      // ignore
    }
    assert.deepStrictEqual(scope.terminate(), scenarioCase.expected.terminate);
    return;
  },

  'undefined-values': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize({ undef: undefined });
    scope.execute(() => {
      assert.strictEqual(context.get('undef'), undefined);
      assert.strictEqual(context.has('undef'), scenarioCase.expected.has);
    });
    const final = scope.terminate();
    assert.strictEqual(final.undef, undefined);
    assert.strictEqual('undef' in final, scenarioCase.expected.finalHas);
    return;
  },

  'null-values': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      assert.strictEqual(context.get('nul'), null);
    });
    assert.deepStrictEqual(scope.terminate(), scenarioCase.expected.terminate);
    return;
  },

  'symbol-key-string': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      assert.strictEqual(context.get('Symbol(test)'), scenarioCase.expected.value);
    });
    scope.terminate();
    return;
  },

  'empty-string-key': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      assert.strictEqual(context.get(''), scenarioCase.expected.value);
    });
    scope.terminate();
    return;
  },

  'long-key-name': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const key = 'a'.repeat(scopeNumber(scenarioCase, 'keyLength'));
    const scope = context.initialize({ [key]: scenarioCase.expected.value });
    scope.execute(() => {
      assert.strictEqual(context.get(key), scenarioCase.expected.value);
    });
    scope.terminate();
    return;
  },

  'complex-object-values': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const initial = scopeInitial(scenarioCase);
    if (initial === undefined) {
      throw new TypeError('input.scope.initial must be an object');
    }
    const complex = requireRecord(initial.complex, 'input.scope.initial.complex');
    const scope = context.initialize(initial);
    scope.execute(() => {
      const retrieved = context.get('complex');
      assert.strictEqual(retrieved, complex);
    });
    const final = scope.terminate();
    assert.strictEqual(final.complex, complex);
    return;
  },

  'function-values': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize({ fn: scopeFunctionFixture(scenarioCase, 'fn') });
    scope.execute(() => {
      const retrieved = context.get('fn');
      if (typeof retrieved !== 'function') {
        throw new TypeError('Expected callable context value');
      }
      assert.strictEqual(Reflect.apply(retrieved, undefined, [5]), scenarioCase.expected.result);
    });
    return;
  },

  'many-keys': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const count = scopeNumber(scenarioCase, 'count');
    const initial: Record<string, number> = {};
    for (let i = 0; i < count; i += 1) {
      initial[`key${i}`] = i;
    }
    const scope = context.initialize(initial);
    scope.execute(() => {
      assert.strictEqual(context.keys().length, scenarioCase.expected.size);
      assert.strictEqual(context.get('key500'), scenarioCase.expected.key500);
    });
    assert.strictEqual(Object.keys(scope.terminate()).length, scenarioCase.expected.size);
    return;
  },

  'request-handling-pattern': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const expectedResponse = requireRecord(scenarioCase.expected.response, 'expected.response');
    const expectedFinalState = requireRecord(scenarioCase.expected.finalState, 'expected.finalState');
    const handleRequest = async (requestId: string): Promise<{ finalState: Record<string, unknown>; response: { body: string; status: number } }> => {
      const scope = context.initialize({ requestId, startTime: Date.now() });
      const response = await scope.execute(async () => {
        await setTimeout(5);
        context.set('userId', expectedFinalState.userId);
        await setTimeout(5);
        context.set('result', { data: 'processed' });
        return { body: JSON.stringify(context.get('result')), status: Number(expectedResponse.status) };
      });
      return { finalState: scope.terminate(), response };
    };
    return handleRequest(scopeString(scenarioCase, 'requestId')).then((result) => {
      assert.strictEqual(result.response.status, expectedResponse.status);
      assert.strictEqual(result.finalState.requestId, expectedFinalState.requestId);
      assert.strictEqual(result.finalState.userId, expectedFinalState.userId);
      assert.ok(typeof result.finalState.startTime === 'number');
    });
  },

  'middleware-chain-pattern': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const expectedUser = requireRecord(scenarioCase.expected.user, 'expected.user');
    type Middleware = () => void;
    const runMiddlewareChain = (middlewares: Middleware[], initial: Record<string, unknown>): Record<string, unknown> => {
      const scope = context.initialize(initial);
      for (const middleware of middlewares) {
        scope.execute(middleware);
      }
      return scope.terminate();
    };
    const authMiddleware: Middleware = () => { context.set('authenticated', true); context.set('user', expectedUser); };
    const loggingMiddleware: Middleware = () => { context.set('logged', true); };
    const validationMiddleware: Middleware = () => { if (context.get('authenticated') === true) { context.set('validated', true); } };
    assert.deepStrictEqual(runMiddlewareChain(
      [authMiddleware, loggingMiddleware, validationMiddleware],
      scopeInitial(scenarioCase) ?? {}
    ), scenarioCase.expected);
    return;
  },

  'parallel-operations-pattern': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const delays = scopeNumberArray(scenarioCase, 'delays');
    const expectedResults = expectedStringArray(scenarioCase, 'results');
    return scope.execute(async () => {
      const operations = expectedResults.map((result, index) => {
        const delay = delays[index];
        if (delay === undefined) {
          throw new TypeError('input.scope.delays must match expected.results length');
        }

        return setTimeout(delay).then(() => result);
      });
      const operationResults = await Promise.all(operations);
      context.set('results', operationResults);
      context.set('completedAt', Date.now());
    }).then(() => {
      const final = scope.terminate();
      assert.deepStrictEqual(final.results, expectedResults);
      assert.ok(typeof final.completedAt === 'number');
    });
  },
} satisfies Record<ScenarioShape, ScenarioRunner>;

function isScenarioShape(shape: string): shape is ScenarioShape {
  return Object.hasOwn(runnerMap, shape);
}

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  const { shape } = scenarioCase;
  if (!isScenarioShape(shape)) {
    throw new TypeError(`Unsupported scenario shape: ${shape}`);
  }

  return runnerMap[shape](scenarioCase);
}

void describe('Context.initialize() scope lifecycle', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
