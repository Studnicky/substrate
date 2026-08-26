import assert from 'node:assert/strict';
import {
  beforeEach, describe, it
} from 'node:test';

import { FlagDefinitionValidationError, FlagEvaluator } from '../../src/index.js';
import { FlagContextEntity } from '../../src/entities/index.js';
import scenarioGroups from './FlagEvaluator.scenarios.json' with { type: 'json' };

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: { flagEvaluator: Record<string, unknown> };
  shape: string;
  name: string;
};

let evaluator: FlagEvaluator;

void beforeEach(() => {
  evaluator = FlagEvaluator.create();
});

class ObservedEvaluator extends FlagEvaluator {
  readonly evaluateCalls: { context: Record<string, unknown>; flag: string; result: boolean }[] = [];
  readonly defaultCalls: string[] = [];
  readonly ruleMismatchCalls: { flag: string; context: Record<string, unknown> }[] = [];

  protected override onEvaluate(flag: string, context: Record<string, unknown>, result: boolean): void {
    this.evaluateCalls.push({ context, flag, result });
  }

  protected override onDefault(flag: string): void {
    this.defaultCalls.push(flag);
  }

  protected override onRuleMismatch(flag: string, context: Record<string, unknown>): void {
    this.ruleMismatchCalls.push({ context, flag });
  }
}

function definitionOf(input: Record<string, unknown>): Record<string, unknown> {
  return input.definition as Record<string, unknown>;
}

function contextOf(input: Record<string, unknown>): Record<string, unknown> {
  return input.context as Record<string, unknown>;
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const { shape } = scenarioCase;
  const input = scenarioCase.input.flagEvaluator;
  const expected = scenarioCase.expected;

  const runnerMap: Record<ScenarioCase['shape'], () => Promise<void> | void> = {
    'unregistered-flag': () => {
    assert.equal(evaluator.evaluate(input.flag as string, contextOf(input)), expected.result);
    return;
    },

    'disabled-flags': () => {
    for (const [name, definition] of Object.entries(input.definitions as Record<string, Record<string, unknown>>)) {
      evaluator.register(name, definition as never);
    }

    const results = input.evaluations as Array<{ context: Record<string, unknown>; flag: string }>;
    const expectedResults = expected.results as boolean[];
    const first = results[0];
    const second = results[1];
    assert.ok(first !== undefined);
    assert.ok(second !== undefined);
    assert.equal(evaluator.evaluate(first.flag, first.context), expectedResults[0]);
    assert.equal(evaluator.evaluate(second.flag, second.context), expectedResults[1]);
    return;
    },

    'implicit-full-rollout': () => {
    evaluator.register(input.flag as string, definitionOf(input) as never);
    for (const context of input.contexts as Record<string, unknown>[]) {
      assert.equal(evaluator.evaluate(input.flag as string, context), expected.result);
    }
    return;
    },

    'half-rollout': () => {
    evaluator.register(input.flag as string, definitionOf(input) as never);
    const evaluations = input.evaluations as Array<{ context: Record<string, unknown>; result: boolean }>;
    const liveResults: boolean[] = [];
    for (const evaluation of evaluations) {
      const result = evaluator.evaluate(input.flag as string, evaluation.context);
      assert.equal(result, evaluation.result);
      liveResults.push(result);
    }
    assert.equal(liveResults.some((result) => result === true), expected.hasTrue);
    assert.equal(liveResults.some((result) => result === false), expected.hasFalse);
    return;
    },

    'deterministic-rollout': () => {
    evaluator.register(input.flag as string, definitionOf(input) as never);
    const first = evaluator.evaluate(input.flag as string, contextOf(input));
    const second = evaluator.evaluate(input.flag as string, contextOf(input));
    assert.equal(first, expected.result);
    assert.equal(second, expected.result);
    return;
    },

    'independent-flags': () => {
    for (const [name, definition] of Object.entries(input.definitions as Record<string, Record<string, unknown>>)) {
      evaluator.register(name, definition as never);
    }

    const context = contextOf(input);
    const results = Object.fromEntries(
      (input.flags as string[]).map((flag) => [flag, evaluator.evaluate(flag, context)])
    );
    assert.deepStrictEqual(results, expected.results);
    return;
    },

    'register-has-list-unregister': () => {
    const definition = definitionOf(input) as never;
    assert.equal(evaluator.has(input.missingFlag as string), expected.hasBefore);
    assert.deepStrictEqual(evaluator.list(), expected.listBefore);

    for (const flag of input.flags as string[]) {
      evaluator.register(flag, definition);
    }

    assert.equal(evaluator.has((input.flags as string[])[0] as string), expected.hasAfterRegister);
    assert.deepStrictEqual(evaluator.list(), expected.listAfterRegister);

    evaluator.unregister(input.unregisterFlag as string);
    assert.equal(evaluator.has(input.unregisterFlag as string), expected.hasAfterUnregister);
    assert.deepStrictEqual(evaluator.list(), expected.listAfterUnregister);
    return;
    },

    're-register-replaces': () => {
    evaluator.register(input.flag as string, input.firstDefinition as never);
    assert.equal(evaluator.evaluate(input.flag as string, contextOf(input)), expected.first);

    evaluator.register(input.flag as string, input.secondDefinition as never);
    assert.equal(evaluator.evaluate(input.flag as string, contextOf(input)), expected.second);
    return;
    },

    'register-snapshots-definition': () => {
    const definition = structuredClone(definitionOf(input)) as Record<string, unknown>;
    evaluator.register(input.flag as string, definition as never);
    Object.assign(definition, input.mutatedDefinition as Record<string, unknown>);
    assert.equal(evaluator.evaluate(input.flag as string, contextOf(input)), expected.result);
    return;
    },

    'invalid-rollout-range': () => {
    assert.throws(() => {
      evaluator.register(input.flag as string, definitionOf(input) as never);
    }, FlagDefinitionValidationError);
    return;
    },

    'missing-default-value': () => {
    assert.throws(() => {
      evaluator.register(input.flag as string, input.definition as never);
    }, (error: Error) => error instanceof FlagDefinitionValidationError && String(error.message).includes(expected.message as string));
    return;
    },

    'valid-definition-still-works': () => {
    evaluator.register(input.flag as string, definitionOf(input) as never);
    const result = evaluator.evaluate(input.flag as string, contextOf(input));
    assert.equal(result, expected.result);
    return;
    },

    'hook-on-default': () => {
    const observed = ObservedEvaluator.create();
    observed.evaluate(input.flag as string, contextOf(input));
    assert.deepStrictEqual(observed.defaultCalls, expected.defaultCalls);
    return;
    },

    'hook-on-rule-mismatch': () => {
    const observed = ObservedEvaluator.create();
    for (const [name, definition] of Object.entries(input.definitions as Record<string, Record<string, unknown>>)) {
      observed.register(name, definition as never);
    }

    for (const evaluation of input.evaluations as Array<{ context: Record<string, unknown>; flag: string }>) {
      observed.evaluate(evaluation.flag, evaluation.context);
    }

    assert.deepStrictEqual(observed.ruleMismatchCalls.map((entry) => entry.flag), expected.ruleMismatchFlags);
    return;
    },

    'hook-on-evaluate': () => {
    const observed = ObservedEvaluator.create();
    for (const [name, definition] of Object.entries(input.definitions as Record<string, Record<string, unknown>>)) {
      observed.register(name, definition as never);
    }

    for (const evaluation of input.evaluations as Array<{ context: Record<string, unknown>; flag: string }>) {
      observed.evaluate(evaluation.flag, evaluation.context);
    }

    assert.deepStrictEqual(
      observed.evaluateCalls.map((entry) => ({ flag: entry.flag, result: entry.result })),
      expected.evaluateCalls
    );
    return;
    },

    'hook-order': () => {
    const order: string[] = [];
    class OrderedEvaluator extends FlagEvaluator {
      protected override onDefault(): void { order.push('default'); }
      protected override onRuleMismatch(): void { order.push('mismatch'); }
      protected override onEvaluate(): void { order.push('evaluate'); }
    }

    const ordered = OrderedEvaluator.create();
    for (const [name, definition] of Object.entries(input.definitions as Record<string, Record<string, unknown>>)) {
      ordered.register(name, definition as never);
    }

    for (const evaluation of input.evaluations as Array<{ context: Record<string, unknown>; flag: string }>) {
      ordered.evaluate(evaluation.flag, evaluation.context);
    }

    assert.deepStrictEqual(order, expected.order);
    return;
    },

    'hook-context-match': () => {
    const observed = ObservedEvaluator.create();
    observed.register(input.flag as string, definitionOf(input) as never);
    observed.evaluate(input.flag as string, contextOf(input));
    assert.deepStrictEqual(observed.evaluateCalls[0]?.context, expected.context);
    return;
    },

    'throwing-on-default': () => {
    class ThrowingDefaultEvaluator extends FlagEvaluator {
      protected override onDefault(): void {
        throw new Error('onDefault boom');
      }
    }

    const throwingEvaluator = ThrowingDefaultEvaluator.create();
    assert.doesNotThrow(() => {
      assert.equal(throwingEvaluator.evaluate(input.flag as string, contextOf(input)), expected.result);
    });
    return;
    },

    'throwing-on-rule-mismatch': () => {
    class ThrowingMismatchEvaluator extends FlagEvaluator {
      protected override onRuleMismatch(): void {
        throw new Error('onRuleMismatch boom');
      }
    }

    const throwingEvaluator = ThrowingMismatchEvaluator.create();
    throwingEvaluator.register(input.flag as string, definitionOf(input) as never);
    assert.doesNotThrow(() => {
      assert.equal(throwingEvaluator.evaluate(input.flag as string, contextOf(input)), expected.result);
    });
    return;
    },

    'throwing-on-evaluate': () => {
    class ThrowingEvaluateEvaluator extends FlagEvaluator {
      protected override onEvaluate(): void {
        throw new Error('onEvaluate boom');
      }
    }

    const throwingEvaluator = ThrowingEvaluateEvaluator.create();
    throwingEvaluator.register(input.flag as string, definitionOf(input) as never);
    assert.doesNotThrow(() => {
      assert.equal(throwingEvaluator.evaluate(input.flag as string, contextOf(input)), expected.result);
    });
    return;
    },

    'async-on-evaluate-safe': () => {
    class AsyncRejectingEvaluateEvaluator extends FlagEvaluator {
      protected override onEvaluate(): Promise<void> {
        return Promise.reject(new Error('onEvaluate async boom'));
      }
    }

    const asyncEvaluator = AsyncRejectingEvaluateEvaluator.create();
    asyncEvaluator.register(input.flag as string, definitionOf(input) as never);
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    return Promise.resolve()
      .then(() => {
        const result = asyncEvaluator.evaluate(input.flag as string, contextOf(input));
        assert.equal(result, expected.result);
      })
      .then(() => new Promise((resolve) => { setImmediate(resolve); }))
      .then(() => new Promise((resolve) => { setImmediate(resolve); }))
      .then(() => {
        assert.deepStrictEqual(rejectionEvents, expected.rejectionEvents);
      })
      .finally(() => {
        process.off('unhandledRejection', onUnhandledRejection);
      });
    },

    'flag-context-entity-accepts': () => {
    for (const value of input.values as Record<string, unknown>[]) {
      assert.equal(FlagContextEntity.validate(value), expected.result);
    }
    return;
    },

    'flag-context-entity-rejects': () => {
    assert.equal(FlagContextEntity.validate(input.value as Record<string, unknown>), expected.result);
    return;
    }
  };

  const runner = runnerMap[shape];
  if (runner === undefined) {
    throw new Error(`No runner registered for shape: ${shape}`);
  }
  await runner();
}

void describe('FlagEvaluator', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
