import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  beforeEach, describe, it
} from 'node:test';

import { FlagDefinitionValidationError, FlagEvaluator } from '../../src/index.js';
import { FlagContextEntity } from '../../src/entities/index.js';
import { FlagEvaluatorScenarioCaseEntity } from './entities/FlagEvaluatorScenarioCaseEntity.js';
import scenarioGroups from './FlagEvaluator.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(FlagEvaluatorScenarioCaseEntity.Schema, FlagEvaluatorScenarioCaseEntity.Node);

type ScenarioCase = FlagEvaluatorScenarioCaseEntity.Type;

let evaluator: FlagEvaluator;

void beforeEach(() => {
  evaluator = FlagEvaluator.create();
});

class ObservedEvaluator extends FlagEvaluator {
  readonly evaluateCalls: { context: FlagContextEntity.Type; flag: string; result: boolean }[] = [];
  readonly defaultCalls: string[] = [];
  readonly ruleMismatchCalls: { flag: string; context: FlagContextEntity.Type }[] = [];

  protected override onEvaluate(flag: string, context: FlagContextEntity.Type, result: boolean): void {
    this.evaluateCalls.push({ context, flag, result });
  }

  protected override onDefault(flag: string): void {
    this.defaultCalls.push(flag);
  }

  protected override onRuleMismatch(flag: string, context: FlagContextEntity.Type): void {
    this.ruleMismatchCalls.push({ context, flag });
  }
}

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'unregistered-flag': (scenarioCase) => {
    if (scenarioCase.shape !== 'unregistered-flag') { throw RuntimeError.create('unreachable: expected unregistered-flag shape'); }
    const { flag, context } = scenarioCase.input.flagEvaluator;
    assert.equal(evaluator.evaluate(flag, context), scenarioCase.expected.result);
    return;
  },

  'disabled-flags': (scenarioCase) => {
    if (scenarioCase.shape !== 'disabled-flags') { throw RuntimeError.create('unreachable: expected disabled-flags shape'); }
    const { definitions, evaluations } = scenarioCase.input.flagEvaluator;
    for (const [name, definition] of Object.entries(definitions)) {
      evaluator.register(name, definition);
    }

    const expectedResults = scenarioCase.expected.results;
    const first = evaluations[0];
    const second = evaluations[1];
    assert.ok(first !== undefined);
    assert.ok(second !== undefined);
    assert.equal(evaluator.evaluate(first.flag, first.context), expectedResults[0]);
    assert.equal(evaluator.evaluate(second.flag, second.context), expectedResults[1]);
    return;
  },

  'implicit-full-rollout': (scenarioCase) => {
    if (scenarioCase.shape !== 'implicit-full-rollout') { throw RuntimeError.create('unreachable: expected implicit-full-rollout shape'); }
    const { contexts, definition, flag } = scenarioCase.input.flagEvaluator;
    evaluator.register(flag, definition);
    for (const context of contexts) {
      assert.equal(evaluator.evaluate(flag, context), scenarioCase.expected.result);
    }
    return;
  },

  'half-rollout': (scenarioCase) => {
    if (scenarioCase.shape !== 'half-rollout') { throw RuntimeError.create('unreachable: expected half-rollout shape'); }
    const { definition, evaluations, flag } = scenarioCase.input.flagEvaluator;
    evaluator.register(flag, definition);
    const liveResults: boolean[] = [];
    for (const evaluation of evaluations) {
      const result = evaluator.evaluate(flag, evaluation.context);
      assert.equal(result, evaluation.result);
      liveResults.push(result);
    }
    assert.equal(liveResults.some((result) => result === true), scenarioCase.expected.hasTrue);
    assert.equal(liveResults.some((result) => result === false), scenarioCase.expected.hasFalse);
    return;
  },

  'deterministic-rollout': (scenarioCase) => {
    if (scenarioCase.shape !== 'deterministic-rollout') { throw RuntimeError.create('unreachable: expected deterministic-rollout shape'); }
    const { context, definition, flag } = scenarioCase.input.flagEvaluator;
    evaluator.register(flag, definition);
    const first = evaluator.evaluate(flag, context);
    const second = evaluator.evaluate(flag, context);
    assert.equal(first, scenarioCase.expected.result);
    assert.equal(second, scenarioCase.expected.result);
    return;
  },

  'independent-flags': (scenarioCase) => {
    if (scenarioCase.shape !== 'independent-flags') { throw RuntimeError.create('unreachable: expected independent-flags shape'); }
    const { context, definitions, flags } = scenarioCase.input.flagEvaluator;
    for (const [name, definition] of Object.entries(definitions)) {
      evaluator.register(name, definition);
    }

    const results = Object.fromEntries(flags.map((flag) => [flag, evaluator.evaluate(flag, context)]));
    assert.deepStrictEqual(results, scenarioCase.expected.results);
    return;
  },

  'register-has-list-unregister': (scenarioCase) => {
    if (scenarioCase.shape !== 'register-has-list-unregister') { throw RuntimeError.create('unreachable: expected register-has-list-unregister shape'); }
    const { definition, flags, missingFlag, unregisterFlag } = scenarioCase.input.flagEvaluator;
    const { expected } = scenarioCase;
    assert.equal(evaluator.has(missingFlag), expected.hasBefore);
    assert.deepStrictEqual(evaluator.list(), expected.listBefore);

    for (const flag of flags) {
      evaluator.register(flag, definition);
    }

    const firstFlag = flags[0];
    assert.ok(firstFlag !== undefined);
    assert.equal(evaluator.has(firstFlag), expected.hasAfterRegister);
    assert.deepStrictEqual(evaluator.list(), expected.listAfterRegister);

    evaluator.unregister(unregisterFlag);
    assert.equal(evaluator.has(unregisterFlag), expected.hasAfterUnregister);
    assert.deepStrictEqual(evaluator.list(), expected.listAfterUnregister);
    return;
  },

  're-register-replaces': (scenarioCase) => {
    if (scenarioCase.shape !== 're-register-replaces') { throw RuntimeError.create('unreachable: expected re-register-replaces shape'); }
    const { context, firstDefinition, flag, secondDefinition } = scenarioCase.input.flagEvaluator;
    evaluator.register(flag, firstDefinition);
    assert.equal(evaluator.evaluate(flag, context), scenarioCase.expected.first);

    evaluator.register(flag, secondDefinition);
    assert.equal(evaluator.evaluate(flag, context), scenarioCase.expected.second);
    return;
  },

  'register-snapshots-definition': (scenarioCase) => {
    if (scenarioCase.shape !== 'register-snapshots-definition') { throw RuntimeError.create('unreachable: expected register-snapshots-definition shape'); }
    const { context, definition, flag, mutatedDefinition } = scenarioCase.input.flagEvaluator;
    const snapshot = structuredClone(definition);
    evaluator.register(flag, snapshot);
    Object.assign(snapshot, mutatedDefinition);
    assert.equal(evaluator.evaluate(flag, context), scenarioCase.expected.result);
    return;
  },

  'invalid-rollout-range': (scenarioCase) => {
    if (scenarioCase.shape !== 'invalid-rollout-range') { throw RuntimeError.create('unreachable: expected invalid-rollout-range shape'); }
    const { definition, flag } = scenarioCase.input.flagEvaluator;
    assert.throws(() => {
      evaluator.register(flag, definition);
    }, FlagDefinitionValidationError);
    return;
  },

  'missing-default-value': (scenarioCase) => {
    if (scenarioCase.shape !== 'missing-default-value') { throw RuntimeError.create('unreachable: expected missing-default-value shape'); }
    const { definition, flag } = scenarioCase.input.flagEvaluator;
    const { expected } = scenarioCase;
    assert.throws(() => {
      // penitence: as-never — `definition` intentionally omits `defaultValue` to exercise
      // the registration guard; FlagDefinitionEntity.InputType requires it, on purpose.
      evaluator.register(flag, definition as never);
    }, (error: Error) => error instanceof FlagDefinitionValidationError && String(error.message).includes(expected.message));
    return;
  },

  'valid-definition-still-works': (scenarioCase) => {
    if (scenarioCase.shape !== 'valid-definition-still-works') { throw RuntimeError.create('unreachable: expected valid-definition-still-works shape'); }
    const { context, definition, flag } = scenarioCase.input.flagEvaluator;
    evaluator.register(flag, definition);
    const result = evaluator.evaluate(flag, context);
    assert.equal(result, scenarioCase.expected.result);
    return;
  },

  'hook-on-default': (scenarioCase) => {
    if (scenarioCase.shape !== 'hook-on-default') { throw RuntimeError.create('unreachable: expected hook-on-default shape'); }
    const { context, flag } = scenarioCase.input.flagEvaluator;
    const observed = ObservedEvaluator.create();
    observed.evaluate(flag, context);
    assert.deepStrictEqual(observed.defaultCalls, scenarioCase.expected.defaultCalls);
    return;
  },

  'hook-on-rule-mismatch': (scenarioCase) => {
    if (scenarioCase.shape !== 'hook-on-rule-mismatch') { throw RuntimeError.create('unreachable: expected hook-on-rule-mismatch shape'); }
    const { definitions, evaluations } = scenarioCase.input.flagEvaluator;
    const observed = ObservedEvaluator.create();
    for (const [name, definition] of Object.entries(definitions)) {
      observed.register(name, definition);
    }

    for (const evaluation of evaluations) {
      observed.evaluate(evaluation.flag, evaluation.context);
    }

    assert.deepStrictEqual(observed.ruleMismatchCalls.map((entry) => entry.flag), scenarioCase.expected.ruleMismatchFlags);
    return;
  },

  'hook-on-evaluate': (scenarioCase) => {
    if (scenarioCase.shape !== 'hook-on-evaluate') { throw RuntimeError.create('unreachable: expected hook-on-evaluate shape'); }
    const { definitions, evaluations } = scenarioCase.input.flagEvaluator;
    const observed = ObservedEvaluator.create();
    for (const [name, definition] of Object.entries(definitions)) {
      observed.register(name, definition);
    }

    for (const evaluation of evaluations) {
      observed.evaluate(evaluation.flag, evaluation.context);
    }

    assert.deepStrictEqual(
      observed.evaluateCalls.map((entry) => ({ flag: entry.flag, result: entry.result })),
      scenarioCase.expected.evaluateCalls
    );
    return;
  },

  'hook-order': (scenarioCase) => {
    if (scenarioCase.shape !== 'hook-order') { throw RuntimeError.create('unreachable: expected hook-order shape'); }
    const { definitions, evaluations } = scenarioCase.input.flagEvaluator;
    const order: string[] = [];
    class OrderedEvaluator extends FlagEvaluator {
      protected override onDefault(): void { order.push('default'); }
      protected override onRuleMismatch(): void { order.push('mismatch'); }
      protected override onEvaluate(): void { order.push('evaluate'); }
    }

    const ordered = OrderedEvaluator.create();
    for (const [name, definition] of Object.entries(definitions)) {
      ordered.register(name, definition);
    }

    for (const evaluation of evaluations) {
      ordered.evaluate(evaluation.flag, evaluation.context);
    }

    assert.deepStrictEqual(order, scenarioCase.expected.order);
    return;
  },

  'hook-context-match': (scenarioCase) => {
    if (scenarioCase.shape !== 'hook-context-match') { throw RuntimeError.create('unreachable: expected hook-context-match shape'); }
    const { context, definition, flag } = scenarioCase.input.flagEvaluator;
    const observed = ObservedEvaluator.create();
    observed.register(flag, definition);
    observed.evaluate(flag, context);
    assert.deepStrictEqual(observed.evaluateCalls[0]?.context, scenarioCase.expected.context);
    return;
  },

  'throwing-on-default': (scenarioCase) => {
    if (scenarioCase.shape !== 'throwing-on-default') { throw RuntimeError.create('unreachable: expected throwing-on-default shape'); }
    const { context, flag } = scenarioCase.input.flagEvaluator;
    class ThrowingDefaultEvaluator extends FlagEvaluator {
      protected override onDefault(): void {
        throw RuntimeError.create('onDefault boom');
      }
    }

    const throwingEvaluator = ThrowingDefaultEvaluator.create();
    assert.doesNotThrow(() => {
      assert.equal(throwingEvaluator.evaluate(flag, context), scenarioCase.expected.result);
    });
    return;
  },

  'throwing-on-rule-mismatch': (scenarioCase) => {
    if (scenarioCase.shape !== 'throwing-on-rule-mismatch') { throw RuntimeError.create('unreachable: expected throwing-on-rule-mismatch shape'); }
    const { context, definition, flag } = scenarioCase.input.flagEvaluator;
    class ThrowingMismatchEvaluator extends FlagEvaluator {
      protected override onRuleMismatch(): void {
        throw RuntimeError.create('onRuleMismatch boom');
      }
    }

    const throwingEvaluator = ThrowingMismatchEvaluator.create();
    throwingEvaluator.register(flag, definition);
    assert.doesNotThrow(() => {
      assert.equal(throwingEvaluator.evaluate(flag, context), scenarioCase.expected.result);
    });
    return;
  },

  'throwing-on-evaluate': (scenarioCase) => {
    if (scenarioCase.shape !== 'throwing-on-evaluate') { throw RuntimeError.create('unreachable: expected throwing-on-evaluate shape'); }
    const { context, definition, flag } = scenarioCase.input.flagEvaluator;
    class ThrowingEvaluateEvaluator extends FlagEvaluator {
      protected override onEvaluate(): void {
        throw RuntimeError.create('onEvaluate boom');
      }
    }

    const throwingEvaluator = ThrowingEvaluateEvaluator.create();
    throwingEvaluator.register(flag, definition);
    assert.doesNotThrow(() => {
      assert.equal(throwingEvaluator.evaluate(flag, context), scenarioCase.expected.result);
    });
    return;
  },

  'async-on-evaluate-safe': (scenarioCase) => {
    if (scenarioCase.shape !== 'async-on-evaluate-safe') { throw RuntimeError.create('unreachable: expected async-on-evaluate-safe shape'); }
    const { context, definition, flag } = scenarioCase.input.flagEvaluator;
    const { expected } = scenarioCase;
    class AsyncRejectingEvaluateEvaluator extends FlagEvaluator {
      protected override onEvaluate(): Promise<void> {
        return Promise.reject(RuntimeError.create('onEvaluate async boom'));
      }
    }

    const asyncEvaluator = AsyncRejectingEvaluateEvaluator.create();
    asyncEvaluator.register(flag, definition);
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    return Promise.resolve()
      .then(() => {
        const result = asyncEvaluator.evaluate(flag, context);
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

  'flag-context-entity-accepts': (scenarioCase) => {
    if (scenarioCase.shape !== 'flag-context-entity-accepts') { throw RuntimeError.create('unreachable: expected flag-context-entity-accepts shape'); }
    const { values } = scenarioCase.input.flagEvaluator;
    const dynamicContext: FlagContextEntity.Type = { 'cohort': 'beta', 'nested': { 'enabled': true } };
    assert.equal(FlagContextEntity.validate(dynamicContext), true);
    for (const value of values) {
      assert.equal(FlagContextEntity.validate(value), scenarioCase.expected.result);
    }
    return;
  },

  'flag-context-entity-rejects': (scenarioCase) => {
    if (scenarioCase.shape !== 'flag-context-entity-rejects') { throw RuntimeError.create('unreachable: expected flag-context-entity-rejects shape'); }
    const { value } = scenarioCase.input.flagEvaluator;
    assert.equal(FlagContextEntity.validate(value), scenarioCase.expected.result);
    return;
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('FlagEvaluator', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
