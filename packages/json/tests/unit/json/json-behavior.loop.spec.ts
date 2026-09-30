import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { SchemaIntakeError } from '@studnicky/entity/node';
import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { JsonValueEntity, PatchOperationsEntity } from '../../../src/entities/index.js';
import { Draft, Patch, PatchError, Path } from '../../../src/index.js';
import { JsonBehaviorScenarioCaseEntity } from './entities/JsonBehaviorScenarioCaseEntity.js';
import scenarioGroups from './json-behavior.scenarios.json' with { 'type': 'json' };

class StrictPatch extends Patch {
  public readonly isStrict = true;
}

class OpenPath extends Path {
  protected static override isSafeProperty(_name: string): boolean {
    return true;
  }
}

class Widget {
  public constructor(public readonly id: string) {}
}

class InvalidPatchValue {
  static readonly byShape = new Map<string, unknown>([
    ['bigint', 1n],
    ['cycle', InvalidPatchValue.createCycle()],
    ['function', Math.abs],
    ['infinity', Number.POSITIVE_INFINITY],
    ['nan', Number.NaN],
    ['symbol', Symbol('value')]
  ]);

  static createCycle(): Record<string, unknown> {
    const value: Record<string, unknown> = {};
    value.self = value;
    return value;
  }
}

class JsonBehaviorRunners {
  static 'draft-array-delete'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-array-delete'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft array delete base'));
    const expected = ScenarioValues.requireRecord(scenarioCase.expected, 'draft array delete expected');
    const deleteIndex = ScenarioValues.requireNumber(ScenarioValues.requireProperty(input, 'deleteIndex', 'input'), 'draft array delete index');
    const deleteKey = String(deleteIndex);
    const next = Draft.produce(base, (draft) => {
      const items: unknown = Reflect.get(draft, 'items');
      assert.ok(Array.isArray(items), 'draft array delete items must be an array');
      delete items[deleteIndex];
    });
    const items = ScenarioValues.requireArray(Reflect.get(next, 'items'), 'draft array delete result items');
    assert.deepEqual(JsonBehaviorRunners.roundTripJson(next), expected.next);
    assert.equal(Object.keys(items).includes(deleteKey), false);
    assert.equal(deleteKey in items, false);
    assert.equal(items.length, ScenarioValues.requireNumber(ScenarioValues.requireProperty(expected, 'length', 'input'), 'draft array delete expected length'));
  }

  static 'draft-array-index'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-array-index'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft array index base'));
    const next = Draft.produce(base, (draft) => {
      const items: unknown = Reflect.get(draft, 'items');
      assert.ok(Array.isArray(items), 'draft array index items must be an array');
      items[ScenarioValues.requireNumber(ScenarioValues.requireProperty(input, 'index', 'input'), 'draft array index')] = ScenarioValues.requireProperty(input, 'value', 'input');
    });
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.deepEqual(base, input.base);
    assert.notStrictEqual(Reflect.get(next, 'items'), Reflect.get(base, 'items'));
  }

  static 'draft-array-push'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-array-push'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft array push base'));
    const next = Draft.produce(base, (draft) => {
      const items: unknown = Reflect.get(draft, 'items');
      assert.ok(Array.isArray(items), 'draft array push items must be an array');
      items.push(ScenarioValues.requireProperty(input, 'pushValue', 'input'));
    });
    assert.deepEqual(Reflect.get(next, 'items'), ScenarioValues.requireRecord(scenarioCase.expected.next, 'draft array push next').items);
    assert.notStrictEqual(Reflect.get(next, 'items'), Reflect.get(base, 'items'));
    assert.deepEqual(base, scenarioCase.expected.base);
  }

  static 'draft-array-splice'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-array-splice'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft array splice base'));
    const splice = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'splice', 'input'), 'draft array splice config');
    const next = Draft.produce(base, (draft) => {
      const items: unknown = Reflect.get(draft, 'items');
      assert.ok(Array.isArray(items), 'draft array splice items must be an array');
      items.splice(
        ScenarioValues.requireNumber(ScenarioValues.requireProperty(splice, 'start', 'input'), 'draft array splice start'),
        ScenarioValues.requireNumber(ScenarioValues.requireProperty(splice, 'deleteCount', 'input'), 'draft array splice deleteCount'),
        ...ScenarioValues.requireArray(ScenarioValues.requireProperty(splice, 'values', 'input'), 'draft array splice values')
      );
    });
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.deepEqual(base, input.base);
  }

  static 'draft-deep-sharing'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-deep-sharing'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft deep sharing base'));
    const mutation = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'mutation', 'input'), 'draft deep sharing mutation');
    const next = Draft.produce(base, (draft) => {
      JsonBehaviorRunners.applyMutation(draft, mutation);
    });
    assert.notStrictEqual(next, base);
    assert.notStrictEqual(Reflect.get(next, 'branch'), Reflect.get(base, 'branch'));
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.strictEqual(Reflect.get(next, 'untouched'), Reflect.get(base, 'untouched'));
  }

  static 'draft-delete'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-delete'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft delete base'));
    const deleteKey = ScenarioValues.requireString(ScenarioValues.requireProperty(input, 'deleteKey', 'input'), 'draft delete key');
    const next = Draft.produce(base, (draft) => {
      Reflect.deleteProperty(draft, deleteKey);
    });
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.equal(Reflect.get(base, deleteKey), ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft delete source')[deleteKey]);
  }

  static 'draft-noop-base'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-noop-base'>): void {
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(JsonBehaviorRunners.readJson(scenarioCase.input), 'base', 'input'), 'draft no-op base'));
    const next = Draft.produce(base, () => {});
    assert.strictEqual(next === base, scenarioCase.expected.sameReference);
  }

  static 'draft-noop-read'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-noop-read'>): void {
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(JsonBehaviorRunners.readJson(scenarioCase.input), 'base', 'input'), 'draft no-op read base'));
    const next = Draft.produce(base, (draft) => {
      const nested = ScenarioValues.requireRecord(Reflect.get(draft, 'nested'), 'draft no-op read nested');
      void Reflect.get(nested, 'value');
    });
    assert.strictEqual(next === base, scenarioCase.expected.sameReference);
  }

  static 'draft-pass-through'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-pass-through'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const baseInput = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft pass-through base');
    const createdAt = new Date(ScenarioValues.requireString(ScenarioValues.requireProperty(baseInput, 'createdAt', 'input'), 'draft pass-through createdAt'));
    const widget = new Widget(ScenarioValues.requireString(ScenarioValues.requireProperty(baseInput, 'widgetId', 'input'), 'draft pass-through widget id'));
    const base = {
      'createdAt': createdAt,
      'label': ScenarioValues.requireProperty(baseInput, 'label', 'input'),
      'widget': widget
    };
    const next = Draft.produce(base, (draft) => {
      draft.label = ScenarioValues.requireProperty(input, 'nextLabel', 'input');
    });
    assert.strictEqual(next.createdAt === createdAt, scenarioCase.expected.createdAtPassthrough);
    assert.strictEqual(next.widget === widget, scenarioCase.expected.widgetPassthrough);
    assert.strictEqual(next.label, scenarioCase.expected.label);
  }

  static 'draft-patch-add'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-patch-add'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft patch add base'));
    const additions = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'additions', 'input'), 'draft patch add additions');
    const { next, patch } = Draft.producePatch(base, (draft) => {
      Object.assign(draft, additions);
    });
    const target = JsonBehaviorRunners.cloneValue(base);
    Patch.create(patch).apply(target);
    assert.deepEqual(target, next);
    const additionEntries = Object.entries(additions);
    for (let index = 0; index < additionEntries.length; index += 1) {
      const [key, value] = ScenarioValues.requireDefined(additionEntries[index], 'additionEntries[index]');
      assert.equal(Reflect.get(next, key), value);
    }
  }

  static 'draft-patch-empty'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-patch-empty'>): void {
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(JsonBehaviorRunners.readJson(scenarioCase.input), 'base', 'input'), 'draft patch empty base'));
    const { next, patch } = Draft.producePatch(base, () => {});
    assert.strictEqual(next, base);
    assert.deepEqual(patch, scenarioCase.expected.patch);
  }

  static 'draft-patch-escaped-keys'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-patch-escaped-keys'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft patch escaped base');
    const mutations = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'mutations', 'input'), 'draft patch escaped mutations');
    const { patch } = Draft.producePatch(base, (draft) => {
      const mutationEntries = Object.entries(mutations);
      for (let index = 0; index < mutationEntries.length; index += 1) {
        const [key, value] = ScenarioValues.requireDefined(mutationEntries[index], 'mutationEntries[index]');
        ScenarioValues.requireNumber(value, `draft patch escaped mutation ${key}`);
      }
      Object.assign(draft, mutations);
    });
    assert.deepEqual(patch, scenarioCase.expected.patch);
  }

  static 'draft-patch-invalid-value'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-patch-invalid-value'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const invalidValueShape = ScenarioValues.requireString(ScenarioValues.requireProperty(input, 'invalidValueShape', 'input'), 'invalid value shape');
    assert.ok(InvalidPatchValue.byShape.has(invalidValueShape), `Unknown invalid patch value shape: ${invalidValueShape}`);
    const invalidValue = InvalidPatchValue.byShape.get(invalidValueShape);
    assert.throws(
      () => {
        Draft.producePatch({ 'a': 1 }, (draft: Record<string, unknown>) => {
          draft.invalid = invalidValue;
        });
      },
      SchemaIntakeError
    );
  }

  static 'draft-patch-remove'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-patch-remove'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft patch remove base'));
    const deleteKey = ScenarioValues.requireString(ScenarioValues.requireProperty(input, 'deleteKey', 'input'), 'draft patch remove key');
    const { next, patch } = Draft.producePatch(base, (draft) => {
      Reflect.deleteProperty(draft, deleteKey);
    });
    const target = JsonBehaviorRunners.cloneValue(base);
    Patch.create(patch).apply(target);
    assert.deepEqual(target, next);
    assert.ok(!Reflect.has(target, deleteKey));
  }

  static 'draft-patch-roundtrip'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-patch-roundtrip'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft patch roundtrip base'));
    const mutation = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'mutation', 'input'), 'draft patch roundtrip mutation');
    const { next, patch } = Draft.producePatch(base, (draft) => {
      JsonBehaviorRunners.applyMutation(draft, mutation);
    });
    const target = JsonBehaviorRunners.cloneValue(base);
    Patch.create(patch).apply(target);
    assert.deepEqual(target, next);
    assert.equal(Reflect.get(next, 'count'), ScenarioValues.requireProperty(mutation, 'count', 'input'));
    assert.deepEqual(Reflect.get(next, 'meta'), ScenarioValues.requireProperty(mutation, 'meta', 'input'));
    assert.deepEqual(Reflect.get(next, 'tags'), ScenarioValues.requireProperty(mutation, 'tags', 'input'));
  }

  static 'draft-proxy-memo'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-proxy-memo'>): void {
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(JsonBehaviorRunners.readJson(scenarioCase.input), 'base', 'input'), 'draft proxy memo base'));
    let first: unknown;
    let second: unknown;
    Draft.produce(base, (draft) => {
      first = Reflect.get(draft, 'nested');
      second = Reflect.get(draft, 'nested');
    });
    assert.strictEqual(first === second, scenarioCase.expected.memoized);
  }

  static 'draft-proxy-reflection'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-proxy-reflection'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft proxy reflection base'));
    const next = Draft.produce(base, (draft) => {
      const items = ScenarioValues.requireArray(Reflect.get(draft, 'items'), 'draft proxy reflection items');
      const iteratorMethod: unknown = Reflect.get(items, Symbol.iterator);
      const arrayIteratorMethod: unknown = Array.prototype[Symbol.iterator];
      assert.equal(iteratorMethod, arrayIteratorMethod);
      const draftNested: unknown = Reflect.get(draft, 'nested');
      Reflect.set(ScenarioValues.requireRecord(draftNested, 'draft proxy reflection nested'), 'value', ScenarioValues.requireProperty(input, 'nextNestedValue', 'input'));
    });
    const nested = ScenarioValues.requireRecord(Reflect.get(next, 'nested'), 'draft proxy reflection result');
    assert.equal(Reflect.get(nested, 'value'), ScenarioValues.requireProperty(input, 'nextNestedValue', 'input'));
  }

  static 'draft-sibling-sharing'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-sibling-sharing'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft sibling base'));
    const mutation = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'mutation', 'input'), 'draft sibling mutation');
    const next = Draft.produce(base, (draft) => {
      JsonBehaviorRunners.applyMutation(draft, mutation);
    });
    assert.notStrictEqual(next, base);
    assert.notStrictEqual(Reflect.get(next, 'touched'), Reflect.get(base, 'touched'));
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.strictEqual(Reflect.get(next, 'untouched'), Reflect.get(base, 'untouched'));
  }

  static 'draft-top-level'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-top-level'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft top-level base'));
    const mutation = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'mutation', 'input'), 'draft top-level mutation');
    const next = Draft.produce(base, (draft) => {
      JsonBehaviorRunners.applyMutation(draft, mutation);
    });
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.notStrictEqual(next, base);
  }

  static 'draft-untouched'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'draft-untouched'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const base = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'base', 'input'), 'draft untouched base'));
    const mutation = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'mutation', 'input'), 'draft untouched mutation');
    Draft.produce(base, (draft) => {
      JsonBehaviorRunners.applyMutation(draft, mutation);
    });
    assert.deepEqual(base, scenarioCase.expected.base);
  }

  static 'patch-add'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-add'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const operations = ScenarioValues.requireArray(ScenarioValues.requireProperty(input, 'operations', 'input'), 'patch add operations');
    const target: Record<string, unknown> = { 'a': 1 };
    Patch.create(operations[0]).apply(target);
    assert.deepEqual(target, scenarioCase.expected.target);
    const nested: Record<string, unknown> = {};
    Patch.create(operations[1]).apply(nested);
    assert.deepEqual(nested, scenarioCase.expected.nested);
  }

  static 'patch-array-remove-numeric'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-array-remove-numeric'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const target = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'target', 'input'), 'patch array remove target'));
    Patch.create(ScenarioValues.requireProperty(input, 'operation', 'input')).apply(target);
    assert.deepEqual(target, scenarioCase.expected.target);
  }

  static 'patch-copy'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-copy'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const target = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'target', 'input'), 'patch copy target'));
    Patch.create(ScenarioValues.requireProperty(input, 'operation', 'input')).apply(target);
    assert.deepEqual(target, scenarioCase.expected.target);
  }

  static 'patch-create-errors'(): void {
    JsonBehaviorRunners.assertIntakeRejects([{ 'op': 'merge', 'path': '/a' }]);
    JsonBehaviorRunners.assertIntakeRejects([{ 'op': 'add' }]);
    JsonBehaviorRunners.assertIntakeRejects([{ 'extra': true, 'op': 'add', 'path': '/a' }]);
    const invalidValues = [
      Math.abs,
      Symbol('value'),
      1n,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      InvalidPatchValue.createCycle()
    ];
    for (let index = 0; index < invalidValues.length; index += 1) {
      JsonBehaviorRunners.assertIntakeRejects([{ 'op': 'add', 'path': '/value', 'value': invalidValues[index] }]);
    }
  }

  static 'patch-empty'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-empty'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    assert.equal(Patch.create(ScenarioValues.requireProperty(input, 'empty', 'input')).isEmpty(), scenarioCase.expected.empty);
    assert.equal(Patch.create(ScenarioValues.requireProperty(input, 'nonEmpty', 'input')).isEmpty(), scenarioCase.expected.nonEmpty);
  }

  static 'patch-move'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-move'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const target = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'target', 'input'), 'patch move target'));
    Patch.create(ScenarioValues.requireProperty(input, 'operation', 'input')).apply(target);
    assert.deepEqual(target, scenarioCase.expected.target);
  }

  static 'patch-multiple'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-multiple'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const target = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'target', 'input'), 'patch multiple target'));
    Patch.create(ScenarioValues.requireProperty(input, 'operations', 'input')).apply(target);
    assert.deepEqual(target, scenarioCase.expected.target);
  }

  static 'patch-operations'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-operations'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const value = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'value', 'input'), 'patch operations value'));
    const operations = JsonBehaviorRunners.cloneValue(ScenarioValues.requireArray(ScenarioValues.requireProperty(input, 'operations', 'input'), 'patch operations input'));
    Reflect.set(ScenarioValues.requireRecord(operations[0], 'patch operations first operation'), 'value', value);
    const patch = Patch.create(operations);
    Reflect.set(ScenarioValues.requireRecord(Reflect.get(value, 'nested'), 'patch operations nested'), 'count', 2);
    Reflect.set(ScenarioValues.requireRecord(operations[0], 'patch operations first operation'), 'path', '/changed');
    const first = patch.operations;
    const firstOperation = first[0];
    if (firstOperation === undefined || !('value' in firstOperation)) {
      throw RuntimeError.create('Expected patch operation with a value');
    }
    const firstValue = firstOperation.value;
    assert.ok(firstValue !== null && typeof firstValue === 'object' && !Array.isArray(firstValue));
    Reflect.set(ScenarioValues.requireRecord(Reflect.get(firstValue, 'nested'), 'patch operations first value nested'), 'count', 3);
    const target: Record<string, unknown> = {};
    patch.apply(target);
    const appliedValue = target.value;
    assert.ok(appliedValue !== null && typeof appliedValue === 'object' && !Array.isArray(appliedValue));
    Reflect.set(ScenarioValues.requireRecord(Reflect.get(appliedValue, 'nested'), 'patch operations applied nested'), 'count', 4);
    assert.deepEqual(patch.operations, scenarioCase.input.json.operations);
    const nextTarget: Record<string, unknown> = {};
    patch.apply(nextTarget);
    assert.deepEqual(nextTarget, { 'value': scenarioCase.input.json.value });
  }

  static 'patch-path-parsing'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-path-parsing'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const nested = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'nested', 'input'), 'patch path nested');
    const target: Record<string, unknown> = {};
    Patch.create({ 'op': 'add', 'path': nested.path, 'value': nested.value }).apply(target);
    assert.deepEqual(target, scenarioCase.expected.nested);
    const escaped = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord({ 'a/b': 1 }, 'patch path escaped target'));
    const escapedInput = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'escaped', 'input'), 'patch path escaped');
    Patch.create({ 'op': 'replace', 'path': escapedInput.path, 'value': escapedInput.value }).apply(escaped);
    assert.deepEqual(escaped, scenarioCase.expected.escaped);
  }

  static 'patch-remove'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-remove'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const target = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'target', 'input'), 'patch remove target'));
    Patch.create({ 'op': 'remove', 'path': '/a' }).apply(target);
    assert.deepEqual(target, scenarioCase.expected.remaining);
    const arrayTarget = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'arrayTarget', 'input'), 'patch remove array target'));
    assert.throws(
      () => { Patch.create({ 'op': 'remove', 'path': ScenarioValues.requireProperty(input, 'badPath', 'input') }).apply(arrayTarget); },
      PatchError
    );
    assert.deepEqual(arrayTarget.items, scenarioCase.expected.array);
  }

  static 'patch-replace'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-replace'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const target = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'target', 'input'), 'patch replace target'));
    const replacement = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'replacement', 'input'), 'patch replace replacement');
    Patch.create({ 'op': 'replace', 'path': replacement.path, 'value': replacement.value }).apply(target);
    assert.equal(target.a, scenarioCase.expected.replaced);
    const missingPaths = ScenarioValues.requireArray(ScenarioValues.requireProperty(input, 'missingPaths', 'input'), 'patch replace missing paths');
    for (let index = 0; index < missingPaths.length; index += 1) {
      const operation = ScenarioValues.requireRecord(missingPaths[index], 'patch replace missing operation');
      assert.throws(
        () => { Patch.create({ 'op': 'replace', 'path': operation.path, 'value': operation.value }).apply({ 'a': {} }); },
        PatchError
      );
    }
  }

  static 'patch-root-and-errors'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-root-and-errors'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const rootPaths = ScenarioValues.requireArray(ScenarioValues.requireProperty(input, 'rootPaths', 'input'), 'patch root paths');
    for (let index = 0; index < rootPaths.length; index += 1) {
      const path = rootPaths[index];
      const target: Record<string, unknown> = { 'a': 1 };
      Patch.create({ 'op': 'add', 'path': path, 'value': 2 }).apply(target);
      Patch.create({ 'op': 'replace', 'path': path, 'value': 3 }).apply(target);
      Patch.create({ 'op': 'remove', 'path': path }).apply(target);
      assert.deepEqual(target, scenarioCase.expected.rootNoop);
    }
    JsonBehaviorRunners.assertIntakeRejects(['not-operation']);
    JsonBehaviorRunners.assertIntakeRejects([null]);
    JsonBehaviorRunners.assertIntakeRejects([42]);
    assert.throws(() => { Patch.create({ 'op': 'add', 'path': input.invalidPath, 'value': 1 }).apply({}); }, PatchError);
    assert.throws(() => { Patch.create({ 'op': 'add', 'path': input.nonTraversableAddPath, 'value': 1 }).apply({ 'a': 1 }); }, PatchError);
    assert.throws(() => { Patch.create({ 'op': 'test', 'path': input.primitiveTestPath, 'value': 1 }).apply({ 'a': 1 }); }, PatchError);
    assert.throws(() => { Patch.create({ 'op': 'remove', 'path': input.missingRemovePath }).apply({}); }, PatchError);
    assert.throws(() => { Patch.create({ 'op': 'remove', 'path': input.nonObjectRemovePath }).apply({ 'a': 1 }); }, PatchError);
    JsonBehaviorRunners.assertIntakeRejects([{ 'op': 'copy', 'path': '/copy' }]);
    JsonBehaviorRunners.assertIntakeRejects([{ 'op': 'move', 'path': '/move' }]);
  }

  static 'patch-subclass'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-subclass'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const operation = ScenarioValues.requireProperty(input, 'operation', 'input');
    const strictPatch = StrictPatch.create(operation);
    assert.ok(strictPatch instanceof StrictPatch);
    assert.ok(strictPatch instanceof Patch);
    assert.equal(Reflect.get(strictPatch, 'isStrict'), scenarioCase.expected.isStrict);
    const base = Patch.create(operation);
    assert.ok(base instanceof Patch);
    assert.ok(!(base instanceof StrictPatch));
    const target: Record<string, unknown> = {};
    StrictPatch.create({ 'op': 'add', 'path': '/key', 'value': ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'target', 'input'), 'patch subclass target').key }).apply(target);
    assert.deepEqual(target, input.target);
  }

  static 'patch-test'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-test'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const target = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'target', 'input'), 'patch test target'));
    const match = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'match', 'input'), 'patch test match');
    const mismatch = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'mismatch', 'input'), 'patch test mismatch');
    assert.doesNotThrow(() => { Patch.create({ 'op': 'test', 'path': match.path, 'value': match.value }).apply(target); });
    assert.throws(() => { Patch.create({ 'op': 'test', 'path': mismatch.path, 'value': mismatch.value }).apply(target); }, PatchError);
    assert.doesNotThrow(() => { Patch.create({ 'op': 'test', 'path': '/user', 'value': { 'name': 'a' } }).apply({ 'user': { 'name': 'a' } }); });
    assert.doesNotThrow(() => { Patch.create({ 'op': 'test', 'path': '/tags', 'value': [1, 2, 3] }).apply({ 'tags': [1, 2, 3] }); });
    assert.throws(() => { Patch.create({ 'op': 'test', 'path': '/user', 'value': { 'name': 'b' } }).apply({ 'user': { 'name': 'a' } }); }, PatchError);
  }

  static 'patch-to-string'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-to-string'>): void {
    const text = Patch.create(ScenarioValues.requireProperty(JsonBehaviorRunners.readJson(scenarioCase.input), 'operations', 'input')).toString();
    JsonBehaviorRunners.assertContainsAll(text, ScenarioValues.requireStringArray(scenarioCase.expected.contains, 'patch toString contains'));
  }

  static 'patch-to-string-all-ops'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'patch-to-string-all-ops'>): void {
    const text = Patch.create(ScenarioValues.requireProperty(JsonBehaviorRunners.readJson(scenarioCase.input), 'operations', 'input')).toString();
    JsonBehaviorRunners.assertContainsAll(text, ScenarioValues.requireStringArray(scenarioCase.expected.contains, 'patch toString all ops contains'));
  }

  static 'path-access'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'path-access'>): void {
    const input = JsonBehaviorRunners.readJson(scenarioCase.input);
    const pointers = ScenarioValues.requireArray(ScenarioValues.requireProperty(input, 'pointers', 'input'), 'path access pointers');
    const expected = ScenarioValues.requireArray(scenarioCase.expected.access, 'path access expected');
    assert.equal(pointers.length, expected.length);
    for (let index = 0; index < pointers.length; index += 1) {
      assert.equal(Path.toAccess(ScenarioValues.requireString(pointers[index], `path access pointer ${index}`)), expected[index]);
    }
  }

  static 'path-get'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'path-get'>): void {
    const subject = ScenarioValues.requireRecord(ScenarioValues.requireProperty(JsonBehaviorRunners.readJson(scenarioCase.input), 'object', 'input'), 'path get object');
    const subjectJson = JsonValueEntity.intake(subject);
    const getScenarios: [string, unknown][] = [
      ['user', subject.user],
      ['user.name', 'Alice'],
      ['user.address.city', 'Wonderland'],
      ['user.tags[0]', 'admin'],
      ['user.tags[1]', 'user'],
      ['user.missing', undefined],
      ['missing.path', undefined],
      ['__proto__', undefined],
      ['constructor', undefined],
      ['', subjectJson]
    ];
    for (let index = 0; index < getScenarios.length; index += 1) {
      const [path, expected] = ScenarioValues.requireDefined(getScenarios[index], 'getScenarios[index]');
      assert.deepEqual(Path.get(subjectJson, path), expected);
    }
    assert.equal(Path.get(subjectJson, 'user.address.city', { 'maximumDepth': 1 }), undefined);
    const result = Path.get(subjectJson, 'items[*]');
    assert.ok(result !== null && typeof result === 'object');
    assert.equal(Reflect.get(result, 'isWildcard'), scenarioCase.expected.wildcard);
    assert.deepEqual(Reflect.get(result, 'array'), subject.items);
    const target: Record<string, unknown> = {};
    const targetJson = JsonValueEntity.intake(target);
    assert.equal(Path.get(targetJson, '["__proto__"]["polluted"]'), undefined);
    assert.equal(Path.get(targetJson, '["constructor"]["prototype"]'), undefined);
    assert.equal(Path.get(targetJson, '["prototype"]'), undefined);
    const safe = { 'special.key': { 'nested': 'value' } };
    assert.equal(Path.get(JsonValueEntity.intake(safe), '["special.key"]["nested"]'), 'value');
    assert.equal(Path.get(subjectJson, 'user.tags[oops]'), undefined);
    assert.equal(Path.get(subjectJson, 'user.tags[1.5]'), undefined);
    assert.equal(Path.get(subjectJson, 'user.tags[-1]'), undefined);
    assert.equal(Path.get(subjectJson, 'user.tags[0]'), 'admin');
  }

  static 'path-subclass'(scenarioCase: ScenarioCaseOfType<JsonBehaviorScenarioCaseEntity.Type, 'path-subclass'>): void {
    const subject = JsonBehaviorRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(JsonBehaviorRunners.readJson(scenarioCase.input), 'object', 'input'), 'path subclass object'));
    const subjectJson = JsonValueEntity.intake(subject);
    assert.equal(Path.get(subjectJson, '__secret'), undefined);
    assert.equal(OpenPath.get(subjectJson, '__secret'), Reflect.get(subject, '__secret'));
    assert.equal(Path.get(subjectJson, 'layer.__inner'), undefined);
    assert.equal(OpenPath.get(subjectJson, 'layer.__inner'), Reflect.get(ScenarioValues.requireRecord(subject.layer, 'path subclass layer'), '__inner'));
  }

  private static applyMutation(target: Record<string, unknown>, mutation: Readonly<Record<string, unknown>>): void {
    const entries = Object.entries(mutation);
    const leaves = JsonBehaviorRunners.cloneValue(mutation);
    for (let index = 0; index < entries.length; index += 1) {
      const [key, value] = ScenarioValues.requireDefined(entries[index], 'entries[index]');
      const current: unknown = Reflect.get(target, key);
      if (Predicates.isRecord(current) && Predicates.isRecord(value)) {
        JsonBehaviorRunners.applyMutation(current, value);
        Reflect.deleteProperty(leaves, key);
      }
    }
    Object.assign(target, leaves);
  }

  private static assertContainsAll(text: string, expectedTexts: readonly string[]): void {
    for (let index = 0; index < expectedTexts.length; index += 1) {
      assert.ok(text.includes(ScenarioValues.requireDefined(expectedTexts[index], 'expectedTexts[index]')));
    }
  }

  private static assertIntakeRejects(candidate: readonly unknown[]): void {
    assert.throws(() => {
      const intaken = PatchOperationsEntity.intake(candidate);
      return intaken;
    }, SchemaIntakeError);
  }

  private static cloneValue<TValue>(value: TValue): TValue {
    try {
      const cloned = structuredClone(value);
      return cloned;
    } catch (cause) {
      throw RuntimeError.create('Scenario value is not structured-cloneable', { 'cause': cause });
    }
  }

  private static readJson(input: { readonly 'json': Readonly<Record<string, unknown>> }): Record<string, unknown> {
    const json = ScenarioValues.requireRecord(input.json, 'input.json');
    return json;
  }

  private static roundTripJson(value: Readonly<Record<string, unknown>>): unknown {
    try {
      const parsed: unknown = JSON.parse(JSON.stringify(value));
      return parsed;
    } catch (cause) {
      throw RuntimeError.create('Scenario value does not survive a JSON round trip', { 'cause': cause });
    }
  }
}

ScenarioSuite.register({
  'entity': JsonBehaviorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'JSON behavior',
  'runners': JsonBehaviorRunners
});

void describe('Draft runtime value pass-through', () => {
  void it('preserves Date, Map, Set, and class instance references while drafting a sibling', () => {
    const createdAt = new Date(1);
    const tags = new Set(['primary']);
    const attributes = new Map([['status', 'active']]);
    const widget = new Widget('widget-1');
    const next = Draft.produce({ 'attributes': attributes, 'createdAt': createdAt, 'label': 'before', 'tags': tags, 'widget': widget }, (draft) => {
      draft.label = 'after';
    });
    assert.strictEqual(next.createdAt, createdAt);
    assert.strictEqual(next.tags, tags);
    assert.strictEqual(next.attributes, attributes);
    assert.strictEqual(next.widget, widget);
    assert.equal(next.label, 'after');
  });
});

void describe('Patch diff', () => {
  void it('emits an RFC-6902 patch between independently obtained JSON values', () => {
    const before = { 'items': ['one', 'two'], 'nested': { '/~': 1, 'value': 'before' }, 'remove': true };
    const after = { 'added': false, 'items': ['one', 'three'], 'nested': { '/~': 2, 'value': 'after' } };
    const patch = Patch.diff(before, after);
    const replay = { 'items': ['one', 'two'], 'nested': { '/~': 1, 'value': 'before' }, 'remove': true };

    patch.apply(replay);

    assert.deepEqual(replay, after);
    assert.deepEqual(patch.operations, [
      { 'op': 'remove', 'path': '/remove' },
      { 'op': 'add', 'path': '/added', 'value': false },
      { 'op': 'replace', 'path': '/items/1', 'value': 'three' },
      { 'op': 'replace', 'path': '/nested/~1~0', 'value': 2 },
      { 'op': 'replace', 'path': '/nested/value', 'value': 'after' }
    ]);
    assert.ok(StrictPatch.diff(before, after) instanceof StrictPatch);
  });
});
