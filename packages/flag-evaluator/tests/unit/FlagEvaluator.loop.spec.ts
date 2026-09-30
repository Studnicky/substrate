import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { FlagContextEntity, FlagDefinitionEntity } from '../../src/entities/index.js';
import { FlagDefinitionValidationError, FlagEvaluator } from '../../src/index.js';
import { FlagEvaluatorScenarioCaseEntity } from './entities/FlagEvaluatorScenarioCaseEntity.js';
import scenarioGroups from './FlagEvaluator.scenarios.json' with { 'type': 'json' };

class ObservedEvaluator extends FlagEvaluator {
  readonly evaluateCalls: { 'context': FlagContextEntity.Type; 'flag': string; 'result': boolean }[] = [];
  readonly defaultCalls: string[] = [];
  readonly ruleMismatchCalls: { 'context': FlagContextEntity.Type; 'flag': string; }[] = [];

  protected override onEvaluate(flag: string, context: FlagContextEntity.Type, result: boolean): void {
    this.evaluateCalls.push({ 'context': context, 'flag': flag, 'result': result });
  }

  protected override onDefault(flag: string): void {
    this.defaultCalls.push(flag);
  }

  protected override onRuleMismatch(flag: string, context: FlagContextEntity.Type): void {
    this.ruleMismatchCalls.push({ 'context': context, 'flag': flag });
  }
}

class FlagEvaluatorRunners {
  static 'async-on-evaluate-safe'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'async-on-evaluate-safe'>): Promise<void> {
    const { context, definition, flag } = scenarioCase.input.flagEvaluator;
    const { expected } = scenarioCase;
    const asyncEvaluator = FlagEvaluator.create();
    Object.assign(asyncEvaluator, { 'onEvaluate': () => {
      const returned = Promise.reject(RuntimeError.create('onEvaluate async boom'));
      return returned;
    } });
    asyncEvaluator.register(flag, definition);
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    const returned = Promise.resolve()
      .then(() => {
        const result = asyncEvaluator.evaluate(flag, context);
        assert.equal(result, expected.result);
      })
      .then(() => {return new Promise((resolve) => { setImmediate(resolve); });})
      .then(() => {return new Promise((resolve) => { setImmediate(resolve); });})
      .then(() => {
        assert.deepStrictEqual(rejectionEvents, expected.rejectionEvents);
      })
      .finally(() => {
        process.off('unhandledRejection', onUnhandledRejection);
      });
    return returned;
  }

  static 'deterministic-rollout'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'deterministic-rollout'>): void {
    const evaluator = FlagEvaluator.create();
    const { context, definition, flag } = scenarioCase.input.flagEvaluator;
    evaluator.register(flag, definition);
    const first = evaluator.evaluate(flag, context);
    const second = evaluator.evaluate(flag, context);
    assert.equal(first, scenarioCase.expected.result);
    assert.equal(second, scenarioCase.expected.result);
  }

  static 'disabled-flags'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'disabled-flags'>): void {
    const evaluator = FlagEvaluator.create();
    const { definitions, evaluations } = scenarioCase.input.flagEvaluator;
    FlagEvaluatorRunners.registerDefinitions(evaluator, definitions);

    const expectedResults = scenarioCase.expected.results;
    const first = evaluations[0];
    const second = evaluations[1];
    assert.ok(first !== undefined);
    assert.ok(second !== undefined);
    assert.equal(evaluator.evaluate(first.flag, first.context), expectedResults[0]);
    assert.equal(evaluator.evaluate(second.flag, second.context), expectedResults[1]);
  }

  static 'flag-context-entity-accepts'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'flag-context-entity-accepts'>): void {
    const { values } = scenarioCase.input.flagEvaluator;
    const dynamicContext: FlagContextEntity.Type = { 'cohort': 'beta', 'nested': { 'enabled': true } };
    assert.equal(FlagContextEntity.validate(dynamicContext), true);
    for (let index = 0; index < values.length; index += 1) {
      assert.equal(FlagContextEntity.validate(values[index]), scenarioCase.expected.result);
    }
  }

  static 'flag-context-entity-rejects'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'flag-context-entity-rejects'>): void {
    const { value } = scenarioCase.input.flagEvaluator;
    assert.equal(FlagContextEntity.validate(value), scenarioCase.expected.result);
  }

  static 'half-rollout'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'half-rollout'>): void {
    const evaluator = FlagEvaluator.create();
    const { definition, evaluations, flag } = scenarioCase.input.flagEvaluator;
    evaluator.register(flag, definition);
    const liveResults: boolean[] = [];
    for (let index = 0; index < evaluations.length; index += 1) {
      const evaluation = ScenarioValues.requireDefined(evaluations[index], 'Scenario evaluations[index]');
      const result = evaluator.evaluate(flag, evaluation.context);
      assert.equal(result, evaluation.result);
      liveResults.push(result);
    }
    assert.equal(liveResults.some((result) => {
      const returned = result === true;
      return returned;
    }), scenarioCase.expected.hasTrue);
    assert.equal(liveResults.some((result) => {
      const returned = result === false;
      return returned;
    }), scenarioCase.expected.hasFalse);
  }

  static 'hook-context-match'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'hook-context-match'>): void {
    const { context, definition, flag } = scenarioCase.input.flagEvaluator;
    const observed = ObservedEvaluator.create();
    observed.register(flag, definition);
    observed.evaluate(flag, context);
    assert.deepStrictEqual(observed.evaluateCalls[0]?.context, scenarioCase.expected.context);
  }

  static 'hook-on-default'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'hook-on-default'>): void {
    const { context, flag } = scenarioCase.input.flagEvaluator;
    const observed = ObservedEvaluator.create();
    observed.evaluate(flag, context);
    assert.deepStrictEqual(observed.defaultCalls, scenarioCase.expected.defaultCalls);
  }

  static 'hook-on-evaluate'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'hook-on-evaluate'>): void {
    const { definitions, evaluations } = scenarioCase.input.flagEvaluator;
    const observed = ObservedEvaluator.create();
    FlagEvaluatorRunners.registerDefinitions(observed, definitions);

    for (let index = 0; index < evaluations.length; index += 1) {
      const evaluation = ScenarioValues.requireDefined(evaluations[index], 'Scenario evaluations[index]');
      observed.evaluate(evaluation.flag, evaluation.context);
    }

    assert.deepStrictEqual(
      observed.evaluateCalls.map((entry) => {return { 'flag': entry.flag, 'result': entry.result };}),
      scenarioCase.expected.evaluateCalls
    );
  }

  static 'hook-on-rule-mismatch'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'hook-on-rule-mismatch'>): void {
    const { definitions, evaluations } = scenarioCase.input.flagEvaluator;
    const observed = ObservedEvaluator.create();
    FlagEvaluatorRunners.registerDefinitions(observed, definitions);

    for (let index = 0; index < evaluations.length; index += 1) {
      const evaluation = ScenarioValues.requireDefined(evaluations[index], 'Scenario evaluations[index]');
      observed.evaluate(evaluation.flag, evaluation.context);
    }

    assert.deepStrictEqual(observed.ruleMismatchCalls.map((entry) => {return entry.flag;}), scenarioCase.expected.ruleMismatchFlags);
  }

  static 'hook-order'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'hook-order'>): void {
    const { definitions, evaluations } = scenarioCase.input.flagEvaluator;
    const order: string[] = [];
    class OrderedEvaluator extends FlagEvaluator {
      protected override onDefault(): void { order.push('default'); }
      protected override onRuleMismatch(): void { order.push('mismatch'); }
      protected override onEvaluate(): void { order.push('evaluate'); }
    }

    const ordered = OrderedEvaluator.create();
    FlagEvaluatorRunners.registerDefinitions(ordered, definitions);

    for (let index = 0; index < evaluations.length; index += 1) {
      const evaluation = ScenarioValues.requireDefined(evaluations[index], 'Scenario evaluations[index]');
      ordered.evaluate(evaluation.flag, evaluation.context);
    }

    assert.deepStrictEqual(order, scenarioCase.expected.order);
  }

  static 'implicit-full-rollout'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'implicit-full-rollout'>): void {
    const evaluator = FlagEvaluator.create();
    const { contexts, definition, flag } = scenarioCase.input.flagEvaluator;
    evaluator.register(flag, definition);
    for (let index = 0; index < contexts.length; index += 1) {
      const context = ScenarioValues.requireDefined(contexts[index], 'Scenario contexts[index]');
      assert.equal(evaluator.evaluate(flag, context), scenarioCase.expected.result);
    }
  }

  static 'independent-flags'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'independent-flags'>): void {
    const evaluator = FlagEvaluator.create();
    const { context, definitions, flags } = scenarioCase.input.flagEvaluator;
    FlagEvaluatorRunners.registerDefinitions(evaluator, definitions);

    const expectedResults = scenarioCase.expected.results;
    assert.strictEqual(Object.keys(expectedResults).length, new Set(flags).size);
    for (let index = 0; index < flags.length; index += 1) {
      const flag = ScenarioValues.requireString(flags[index], 'Scenario flags[index]');
      assert.strictEqual(evaluator.evaluate(flag, context), Reflect.get(expectedResults, flag));
    }
  }

  static 'invalid-rollout-range'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'invalid-rollout-range'>): void {
    const evaluator = FlagEvaluator.create();
    const { definition, flag } = scenarioCase.input.flagEvaluator;
    assert.throws(() => {
      evaluator.register(flag, definition);
    }, FlagDefinitionValidationError);
  }

  static 'missing-default-value'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'missing-default-value'>): void {
    const { definition } = scenarioCase.input.flagEvaluator;
    const { expected } = scenarioCase;
    // `definition` intentionally omits `defaultValue`, so it fails FlagDefinitionEntity.InputType
    // at compile time. Exercise the guard `register()` delegates to through its unknown-accepting
    // `validate` surface instead of forcing the value through the typed `register()` parameter.
    assert.strictEqual(FlagDefinitionEntity.validate(definition), false);
    const messages = (FlagDefinitionEntity.validate.errors ?? [])
      .map((error) => {
        const result = error.message ?? String(error);
        return result;
      })
      .join('; ');
    assert.ok(messages.includes(expected.message));
  }

  static 're-register-replaces'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 're-register-replaces'>): void {
    const evaluator = FlagEvaluator.create();
    const { context, firstDefinition, flag, secondDefinition } = scenarioCase.input.flagEvaluator;
    evaluator.register(flag, firstDefinition);
    assert.equal(evaluator.evaluate(flag, context), scenarioCase.expected.first);

    evaluator.register(flag, secondDefinition);
    assert.equal(evaluator.evaluate(flag, context), scenarioCase.expected.second);
  }

  static 'register-has-list-unregister'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'register-has-list-unregister'>): void {
    const evaluator = FlagEvaluator.create();
    const { definition, flags, missingFlag, unregisterFlag } = scenarioCase.input.flagEvaluator;
    const { expected } = scenarioCase;
    assert.equal(evaluator.has(missingFlag), expected.hasBefore);
    assert.deepStrictEqual(evaluator.list(), expected.listBefore);

    for (let index = 0; index < flags.length; index += 1) {
      evaluator.register(ScenarioValues.requireString(flags[index], 'Scenario flags[index]'), definition);
    }

    const firstFlag = flags[0];
    assert.ok(firstFlag !== undefined);
    assert.equal(evaluator.has(firstFlag), expected.hasAfterRegister);
    assert.deepStrictEqual(evaluator.list(), expected.listAfterRegister);

    evaluator.unregister(unregisterFlag);
    assert.equal(evaluator.has(unregisterFlag), expected.hasAfterUnregister);
    assert.deepStrictEqual(evaluator.list(), expected.listAfterUnregister);
  }

  static 'register-snapshots-definition'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'register-snapshots-definition'>): void {
    const evaluator = FlagEvaluator.create();
    const { context, definition, flag, mutatedDefinition } = scenarioCase.input.flagEvaluator;
    let snapshot: typeof definition;
    try {
      snapshot = structuredClone(definition);
    } catch (cause) {
      throw RuntimeError.create('definition is not structured-cloneable', { 'cause': cause });
    }
    evaluator.register(flag, snapshot);
    Object.assign(snapshot, mutatedDefinition);
    assert.equal(evaluator.evaluate(flag, context), scenarioCase.expected.result);
  }

  static 'throwing-on-default'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'throwing-on-default'>): void {
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
  }

  static 'throwing-on-evaluate'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'throwing-on-evaluate'>): void {
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
  }

  static 'throwing-on-rule-mismatch'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'throwing-on-rule-mismatch'>): void {
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
  }

  static 'unregistered-flag'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'unregistered-flag'>): void {
    const evaluator = FlagEvaluator.create();
    const { context, flag } = scenarioCase.input.flagEvaluator;
    assert.equal(evaluator.evaluate(flag, context), scenarioCase.expected.result);
  }

  static 'valid-definition-still-works'(scenarioCase: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'valid-definition-still-works'>): void {
    const evaluator = FlagEvaluator.create();
    const { context, definition, flag } = scenarioCase.input.flagEvaluator;
    evaluator.register(flag, definition);
    const result = evaluator.evaluate(flag, context);
    assert.equal(result, scenarioCase.expected.result);
  }

  private static registerDefinitions(target: FlagEvaluator, definitions: ScenarioCaseOfType<FlagEvaluatorScenarioCaseEntity.Type, 'hook-on-evaluate'>['input']['flagEvaluator']['definitions']): void {
    const entries = Object.entries(definitions);
    for (let index = 0; index < entries.length; index += 1) {
      const [name, definition] = ScenarioValues.requireDefined(entries[index], 'Scenario definitions entry');
      target.register(name, definition);
    }
  }
}

ScenarioSuite.register({
  'entity': FlagEvaluatorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FlagEvaluator',
  'runners': FlagEvaluatorRunners
});
