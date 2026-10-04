import { SchemaIntakeError } from '@studnicky/entity/node';
import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { JsonBehaviorScenarioCaseEntity } from './entities/JsonBehaviorScenarioCaseEntity.js';

import { ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { JsonValueEntity, PatchOperationsEntity } from '../../../src/entities/index.js';
import { Path } from '../../../src/index.js';
import { OpenPath } from './OpenPath.js';

export class JsonBehaviorTestSupport {
  static readonly invalidValuesByShape = new Map<string, unknown>([
    ['bigint', 1n],
    ['cycle', JsonBehaviorTestSupport.createCycle()],
    ['function', Math.abs],
    ['infinity', Number.POSITIVE_INFINITY],
    ['nan', Number.NaN],
    ['symbol', Symbol('value')]
  ]);

  static applyMutation(
    target: Record<string, unknown>,
    mutation: Readonly<Record<string, unknown>>
  ): void {
    const entries = Object.entries(mutation);
    const leaves = JsonBehaviorTestSupport.cloneValue(mutation);
    for (let index = 0; index < entries.length; index += 1) {
      const [key, value] = ScenarioValues.requireDefined(entries[index], 'entries[index]');
      const current: unknown = Reflect.get(target, key);
      if (Predicates.isRecord(current) && Predicates.isRecord(value)) {
        JsonBehaviorTestSupport.applyMutation(current, value);
        Reflect.deleteProperty(leaves, key);
      }
    }
    Object.assign(target, leaves);
  }

  static assertContainsAll(text: string, expectedTexts: readonly string[]): void {
    for (let index = 0; index < expectedTexts.length; index += 1) {
      assert.ok(
        text.includes(ScenarioValues.requireDefined(expectedTexts[index], 'expectedTexts[index]'))
      );
    }
  }

  static assertIntakeRejects(candidate: readonly unknown[]): void {
    assert.throws(() => {
      const intaken = PatchOperationsEntity.intake(candidate);
      return intaken;
    }, SchemaIntakeError);
  }

  static cloneValue<TValue>(value: TValue): TValue {
    try {
      const cloned = structuredClone(value);
      return cloned;
    } catch (cause) {
      throw RuntimeError.create('Scenario value is not structured-cloneable', { 'cause': cause });
    }
  }

  static createCycle(): Record<string, unknown> {
    const value: Record<string, unknown> = {};
    value.self = value;
    return value;
  }

  static readJson(input: {
    readonly 'json': Readonly<Record<string, unknown>>;
  }): Record<string, unknown> {
    const json = ScenarioValues.requireRecord(input.json, 'input.json');
    return json;
  }

  static runPathSubclass(
    scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'path-subclass'>
  ): void {
    const subject = JsonBehaviorTestSupport.cloneValue(
      ScenarioValues.requireRecord(
        ScenarioValues.requireProperty(
          JsonBehaviorTestSupport.readJson(scenarioCase.input),
          'object',
          'input'
        ),
        'path subclass object'
      )
    );
    const subjectJson = JsonValueEntity.intake(subject);
    assert.equal(Path.get(subjectJson, '__secret'), undefined);
    assert.equal(OpenPath.get(subjectJson, '__secret'), Reflect.get(subject, '__secret'));
    assert.equal(Path.get(subjectJson, 'layer.__inner'), undefined);
    assert.equal(
      OpenPath.get(subjectJson, 'layer.__inner'),
      Reflect.get(ScenarioValues.requireRecord(subject.layer, 'path subclass layer'), '__inner')
    );
  }

  static roundTripJson(value: Readonly<Record<string, unknown>>): unknown {
    try {
      const parsed: unknown = JSON.parse(JSON.stringify(value));
      return parsed;
    } catch (cause) {
      throw RuntimeError.create('Scenario value does not survive a JSON round trip', {
        'cause': cause
      });
    }
  }
}
