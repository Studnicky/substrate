import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Draft, Patch, Path, PatchError, SchemaIntakeError } from '../../../src/index.js';
import { JsonValueEntity, PatchOperationsEntity } from '../../../src/entities/index.js';

import scenarioGroups from './json-behavior.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'draft-array-index'
  | 'draft-array-push'
  | 'draft-array-splice'
  | 'draft-deep-sharing'
  | 'draft-delete'
  | 'draft-noop-base'
  | 'draft-noop-read'
  | 'draft-pass-through'
  | 'draft-patch-add'
  | 'draft-patch-empty'
  | 'draft-patch-escaped-keys'
  | 'draft-patch-invalid-value'
  | 'draft-patch-remove'
  | 'draft-patch-roundtrip'
  | 'draft-proxy-memo'
  | 'draft-proxy-reflection'
  | 'draft-sibling-sharing'
  | 'draft-top-level'
  | 'draft-untouched'
  | 'patch-add'
  | 'patch-array-remove-numeric'
  | 'patch-copy'
  | 'patch-create-errors'
  | 'patch-empty'
  | 'patch-move'
  | 'patch-multiple'
  | 'patch-operations'
  | 'patch-path-parsing'
  | 'patch-remove'
  | 'patch-replace'
  | 'patch-root-and-errors'
  | 'patch-subclass'
  | 'patch-test'
  | 'patch-to-string'
  | 'patch-to-string-all-ops'
  | 'path-access'
  | 'path-get'
  | 'path-subclass';

type JsonObject = Record<string, unknown>;
type ImportedScenarioCase = (typeof scenarioGroups.cases)[number];
type ScenarioCase = {
  description: string;
  expected: JsonObject;
  input: { json: JsonObject };
  shape: ScenarioShape;
  name: string;
};
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

type InvalidPatchValueShape = 'bigint' | 'cycle' | 'function' | 'infinity' | 'nan' | 'symbol';

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

const invalidPatchValueByShape = {
  bigint: (): bigint => 1n,
  cycle: (): Record<string, unknown> => {
    const value: Record<string, unknown> = {};
    value.self = value;
    return value;
  },
  function: (): (() => number) => {
    return () => 1;
  },
  infinity: (): number => Number.POSITIVE_INFINITY,
  nan: (): number => Number.NaN,
  symbol: (): symbol => Symbol('value')
} satisfies Record<InvalidPatchValueShape, () => unknown>;

const scenarioRunnerMap = {
  'draft-top-level': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft top-level base');
    const mutation = requireJsonObject(requiredValue(input, 'mutation'), 'draft top-level mutation');
    const next = Draft.produce(base, (draft) => {
      applyJsonMutation(draft, mutation);
    });
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.notStrictEqual(next, base);
  },

  'draft-untouched': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft untouched base');
    const mutation = requireJsonObject(requiredValue(input, 'mutation'), 'draft untouched mutation');
    Draft.produce(base, (draft) => {
      applyJsonMutation(draft, mutation);
    });
    assert.deepEqual(base, scenarioCase.expected.base);
  },

  'draft-sibling-sharing': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft sibling base');
    const mutation = requireJsonObject(requiredValue(input, 'mutation'), 'draft sibling mutation');
    const next = Draft.produce(base, (draft) => {
      applyJsonMutation(draft, mutation);
    });
    assert.notStrictEqual(next, base);
    assert.notStrictEqual(Reflect.get(next, 'touched'), Reflect.get(base, 'touched'));
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.strictEqual(Reflect.get(next, 'untouched'), Reflect.get(base, 'untouched'));
  },

  'draft-array-push': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft array push base');
    const next = Draft.produce(base, (draft) => {
      requireArray(Reflect.get(draft, 'items'), 'draft array push items').push(requiredValue(input, 'pushValue'));
    });
    assert.deepEqual(Reflect.get(next, 'items'), requireJsonObject(scenarioCase.expected.next, 'draft array push next').items);
    assert.notStrictEqual(Reflect.get(next, 'items'), Reflect.get(base, 'items'));
    assert.deepEqual(base, scenarioCase.expected.base);
  },

  'draft-array-splice': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft array splice base');
    const splice = requireJsonObject(requiredValue(input, 'splice'), 'draft array splice config');
    const next = Draft.produce(base, (draft) => {
      requireArray(Reflect.get(draft, 'items'), 'draft array splice items').splice(
        requireNumber(requiredValue(splice, 'start'), 'draft array splice start'),
        requireNumber(requiredValue(splice, 'deleteCount'), 'draft array splice deleteCount'),
        ...requireArray(requiredValue(splice, 'values'), 'draft array splice values')
      );
    });
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.deepEqual(base, input.base);
  },

  'draft-array-index': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft array index base');
    const next = Draft.produce(base, (draft) => {
      const items = requireArray(Reflect.get(draft, 'items'), 'draft array index items');
      items[requireNumber(requiredValue(input, 'index'), 'draft array index')] = requiredValue(input, 'value');
    });
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.deepEqual(base, input.base);
    assert.notStrictEqual(Reflect.get(next, 'items'), Reflect.get(base, 'items'));
  },

  'draft-noop-base': (scenarioCase) => {
    const base = cloneJsonObject(requiredValue(readJson(scenarioCase), 'base'), 'draft no-op base');
    const next = Draft.produce(base, () => {});
    assert.strictEqual(next === base, scenarioCase.expected.sameReference);
  },

  'draft-noop-read': (scenarioCase) => {
    const base = cloneJsonObject(requiredValue(readJson(scenarioCase), 'base'), 'draft no-op read base');
    const next = Draft.produce(base, (draft) => {
      const nested = requireJsonObject(Reflect.get(draft, 'nested'), 'draft no-op read nested');
      void Reflect.get(nested, 'value');
    });
    assert.strictEqual(next === base, scenarioCase.expected.sameReference);
  },

  'draft-proxy-memo': (scenarioCase) => {
    const base = cloneJsonObject(requiredValue(readJson(scenarioCase), 'base'), 'draft proxy memo base');
    let first: unknown;
    let second: unknown;
    Draft.produce(base, (draft) => {
      first = Reflect.get(draft, 'nested');
      second = Reflect.get(draft, 'nested');
    });
    assert.strictEqual(first === second, scenarioCase.expected.memoized);
  },

  'draft-pass-through': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const baseInput = requireJsonObject(requiredValue(input, 'base'), 'draft pass-through base');
    const createdAt = new Date(requireString(requiredValue(baseInput, 'createdAt'), 'draft pass-through createdAt'));
    const widget = new Widget(requireString(requiredValue(baseInput, 'widgetId'), 'draft pass-through widget id'));
    const base = {
      createdAt,
      label: requiredValue(baseInput, 'label'),
      widget
    };
    const next = Draft.produce(base, (draft) => {
      draft.label = requiredValue(input, 'nextLabel');
    });
    assert.strictEqual(next.createdAt === createdAt, scenarioCase.expected.createdAtPassthrough);
    assert.strictEqual(next.widget === widget, scenarioCase.expected.widgetPassthrough);
    assert.strictEqual(next.label, scenarioCase.expected.label);
  },

  'draft-deep-sharing': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft deep sharing base');
    const mutation = requireJsonObject(requiredValue(input, 'mutation'), 'draft deep sharing mutation');
    const next = Draft.produce(base, (draft) => {
      applyJsonMutation(draft, mutation);
    });
    assert.notStrictEqual(next, base);
    assert.notStrictEqual(Reflect.get(next, 'branch'), Reflect.get(base, 'branch'));
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.strictEqual(Reflect.get(next, 'untouched'), Reflect.get(base, 'untouched'));
  },

  'draft-delete': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft delete base');
    const deleteKey = requireString(requiredValue(input, 'deleteKey'), 'draft delete key');
    const next = Draft.produce(base, (draft) => {
      Reflect.deleteProperty(draft, deleteKey);
    });
    assert.deepEqual(next, scenarioCase.expected.next);
    assert.equal(Reflect.get(base, deleteKey), requireJsonObject(requiredValue(input, 'base'), 'draft delete source')[deleteKey]);
  },

  'draft-patch-roundtrip': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft patch roundtrip base');
    const mutation = requireJsonObject(requiredValue(input, 'mutation'), 'draft patch roundtrip mutation');
    const { next, patch } = Draft.producePatch(base, (draft) => {
      applyJsonMutation(draft, mutation);
    });
    const target = structuredClone(base);
    Patch.create(patch).apply(target);
    assert.deepEqual(target, next);
    assert.equal(Reflect.get(next, 'count'), requiredValue(mutation, 'count'));
    assert.deepEqual(Reflect.get(next, 'meta'), requiredValue(mutation, 'meta'));
    assert.deepEqual(Reflect.get(next, 'tags'), requiredValue(mutation, 'tags'));
  },

  'draft-patch-remove': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft patch remove base');
    const deleteKey = requireString(requiredValue(input, 'deleteKey'), 'draft patch remove key');
    const { next, patch } = Draft.producePatch(base, (draft) => {
      Reflect.deleteProperty(draft, deleteKey);
    });
    const target = structuredClone(base);
    Patch.create(patch).apply(target);
    assert.deepEqual(target, next);
    assert.ok(!Reflect.has(target, deleteKey));
  },

  'draft-patch-add': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft patch add base');
    const addKey = requireString(requiredValue(input, 'addKey'), 'draft patch add key');
    const addValue = requiredValue(input, 'addValue');
    const { next, patch } = Draft.producePatch(base, (draft) => {
      Reflect.set(draft, addKey, addValue);
    });
    const target = structuredClone(base);
    Patch.create(patch).apply(target);
    assert.deepEqual(target, next);
    assert.equal(Reflect.get(next, addKey), addValue);
  },

  'draft-patch-empty': (scenarioCase) => {
    const base = cloneJsonObject(requiredValue(readJson(scenarioCase), 'base'), 'draft patch empty base');
    const { next, patch } = Draft.producePatch(base, () => {});
    assert.strictEqual(next, base);
    assert.deepEqual(patch, scenarioCase.expected.patch);
  },

  'draft-proxy-reflection': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = cloneJsonObject(requiredValue(input, 'base'), 'draft proxy reflection base');
    const next = Draft.produce(base, (draft) => {
      const items = requireArray(Reflect.get(draft, 'items'), 'draft proxy reflection items');
      assert.equal(Reflect.get(items, Symbol.iterator), Array.prototype[Symbol.iterator]);
      Reflect.set(requireJsonObject(Reflect.get(draft, 'nested'), 'draft proxy reflection nested'), 'value', requiredValue(input, 'nextNestedValue'));
    });
    const nested = requireJsonObject(Reflect.get(next, 'nested'), 'draft proxy reflection result');
    assert.equal(Reflect.get(nested, 'value'), requiredValue(input, 'nextNestedValue'));
  },

  'draft-patch-invalid-value': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const invalidValueShape = requireInvalidPatchValueShape(requiredValue(input, 'invalidValueShape'));
    assert.throws(
      () => Draft.producePatch({ a: 1 }, (draft: Record<string, unknown>) => {
        draft.invalid = invalidPatchValueByShape[invalidValueShape]();
      }),
      SchemaIntakeError
    );
  },

  'draft-patch-escaped-keys': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = requireJsonObject(requiredValue(input, 'base'), 'draft patch escaped base');
    const mutations = requireJsonObject(requiredValue(input, 'mutations'), 'draft patch escaped mutations');
    const { patch } = Draft.producePatch(base, (draft) => {
      for (const [key, value] of Object.entries(mutations)) {
        draft[key] = requireNumber(value, `draft patch escaped mutation ${key}`);
      }
    });
    assert.deepEqual(patch, scenarioCase.expected.patch);
  },

  'patch-add': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const operations = requireArray(requiredValue(input, 'operations'), 'patch add operations');
    const target: Record<string, unknown> = { a: 1 };
    Patch.create(operations[0]).apply(target);
    assert.deepEqual(target, scenarioCase.expected.target);
    const nested: Record<string, unknown> = {};
    Patch.create(operations[1]).apply(nested);
    assert.deepEqual(nested, scenarioCase.expected.nested);
  },

  'patch-create-errors': (_scenarioCase) => {
    assert.throws(() => PatchOperationsEntity.intake([{ 'op': 'merge', 'path': '/a' }]), SchemaIntakeError);
    assert.throws(() => PatchOperationsEntity.intake([{ 'op': 'add' }]), SchemaIntakeError);
    assert.throws(() => PatchOperationsEntity.intake([{ 'extra': true, 'op': 'add', 'path': '/a' }]), SchemaIntakeError);
    assert.throws(() => PatchOperationsEntity.intake([{ 'op': 'add', 'path': '/value', 'value': () => 1 }]), SchemaIntakeError);
    assert.throws(() => PatchOperationsEntity.intake([{ 'op': 'add', 'path': '/value', 'value': Symbol('value') }]), SchemaIntakeError);
    assert.throws(() => PatchOperationsEntity.intake([{ 'op': 'add', 'path': '/value', 'value': 1n }]), SchemaIntakeError);
    assert.throws(() => PatchOperationsEntity.intake([{ 'op': 'add', 'path': '/value', 'value': Number.NaN }]), SchemaIntakeError);
    assert.throws(() => PatchOperationsEntity.intake([{ 'op': 'add', 'path': '/value', 'value': Number.POSITIVE_INFINITY }]), SchemaIntakeError);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    assert.throws(() => PatchOperationsEntity.intake([{ 'op': 'add', 'path': '/value', 'value': cyclic }]), SchemaIntakeError);
  },

  'patch-replace': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const target = cloneJsonObject(requiredValue(input, 'target'), 'patch replace target');
    const replacement = requireJsonObject(requiredValue(input, 'replacement'), 'patch replace replacement');
    Patch.create({ op: 'replace', path: replacement.path, value: replacement.value }).apply(target);
    assert.equal(target.a, scenarioCase.expected.replaced);
    for (const missing of requireArray(requiredValue(input, 'missingPaths'), 'patch replace missing paths')) {
      const operation = requireJsonObject(missing, 'patch replace missing operation');
      assert.throws(
        () => Patch.create({ op: 'replace', path: operation.path, value: operation.value }).apply({ a: {} }),
        PatchError
      );
    }
  },

  'patch-remove': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const target = cloneJsonObject(requiredValue(input, 'target'), 'patch remove target');
    Patch.create({ op: 'remove', path: '/a' }).apply(target);
    assert.deepEqual(target, scenarioCase.expected.remaining);
    const arrayTarget = cloneJsonObject(requiredValue(input, 'arrayTarget'), 'patch remove array target');
    assert.throws(
      () => Patch.create({ op: 'remove', path: requiredValue(input, 'badPath') }).apply(arrayTarget),
      PatchError
    );
    assert.deepEqual(arrayTarget.items, scenarioCase.expected.array);
  },

  'patch-copy': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const target = cloneJsonObject(requiredValue(input, 'target'), 'patch copy target');
    Patch.create(requiredValue(input, 'operation')).apply(target);
    assert.deepEqual(target, scenarioCase.expected.target);
  },

  'patch-move': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const target = cloneJsonObject(requiredValue(input, 'target'), 'patch move target');
    Patch.create(requiredValue(input, 'operation')).apply(target);
    assert.deepEqual(target, scenarioCase.expected.target);
  },

  'patch-test': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const target = cloneJsonObject(requiredValue(input, 'target'), 'patch test target');
    const match = requireJsonObject(requiredValue(input, 'match'), 'patch test match');
    const mismatch = requireJsonObject(requiredValue(input, 'mismatch'), 'patch test mismatch');
    assert.doesNotThrow(() => Patch.create({ op: 'test', path: match.path, value: match.value }).apply(target));
    assert.throws(() => Patch.create({ op: 'test', path: mismatch.path, value: mismatch.value }).apply(target), PatchError);
    assert.doesNotThrow(() => Patch.create({ op: 'test', path: '/user', value: { name: 'a' } }).apply({ user: { name: 'a' } }));
    assert.doesNotThrow(() => Patch.create({ op: 'test', path: '/tags', value: [1, 2, 3] }).apply({ tags: [1, 2, 3] }));
    assert.throws(() => Patch.create({ op: 'test', path: '/user', value: { name: 'b' } }).apply({ user: { name: 'a' } }), PatchError);
  },

  'patch-multiple': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const target = cloneJsonObject(requiredValue(input, 'target'), 'patch multiple target');
    Patch.create(requiredValue(input, 'operations')).apply(target);
    assert.deepEqual(target, scenarioCase.expected.target);
  },

  'patch-empty': (scenarioCase) => {
    const input = readJson(scenarioCase);
    assert.equal(Patch.create(requiredValue(input, 'empty')).isEmpty(), scenarioCase.expected.empty);
    assert.equal(Patch.create(requiredValue(input, 'nonEmpty')).isEmpty(), scenarioCase.expected.nonEmpty);
  },

  'patch-to-string': (scenarioCase) => {
    const text = Patch.create(requiredValue(readJson(scenarioCase), 'operations')).toString();
    assertContainsAll(text, scenarioCase.expected.contains, 'patch toString contains');
  },

  'patch-operations': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const value = cloneJsonObject(requiredValue(input, 'value'), 'patch operations value');
    const operations = structuredClone(requireArray(requiredValue(input, 'operations'), 'patch operations input'));
    Reflect.set(requireJsonObject(operations[0], 'patch operations first operation'), 'value', value);
    const patch = Patch.create(operations);
    Reflect.set(requireJsonObject(Reflect.get(value, 'nested'), 'patch operations nested'), 'count', 2);
    Reflect.set(requireJsonObject(operations[0], 'patch operations first operation'), 'path', '/changed');
    const first = patch.operations;
    const firstOperation = first[0];
    if (firstOperation === undefined || !('value' in firstOperation)) {
      throw new Error('Expected patch operation with a value');
    }
    const firstValue = firstOperation.value;
    assert.ok(firstValue !== null && typeof firstValue === 'object' && !Array.isArray(firstValue));
    Reflect.set(requireJsonObject(Reflect.get(firstValue, 'nested'), 'patch operations first value nested'), 'count', 3);
    const target: Record<string, unknown> = {};
    patch.apply(target);
    const appliedValue = target.value;
    assert.ok(appliedValue !== null && typeof appliedValue === 'object' && !Array.isArray(appliedValue));
    Reflect.set(Reflect.get(appliedValue, 'nested'), 'count', 4);
    assert.deepEqual(patch.operations, scenarioCase.input.json.operations);
    const nextTarget: Record<string, unknown> = {};
    patch.apply(nextTarget);
    assert.deepEqual(nextTarget, { value: scenarioCase.input.json.value });
  },

  'patch-path-parsing': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const nested = requireJsonObject(requiredValue(input, 'nested'), 'patch path nested');
    const target: Record<string, unknown> = {};
    Patch.create({ op: 'add', path: nested.path, value: nested.value }).apply(target);
    assert.deepEqual(target, scenarioCase.expected.nested);
    const escaped = cloneJsonObject({ 'a/b': 1 }, 'patch path escaped target');
    const escapedInput = requireJsonObject(requiredValue(input, 'escaped'), 'patch path escaped');
    Patch.create({ op: 'replace', path: escapedInput.path, value: escapedInput.value }).apply(escaped);
    assert.deepEqual(escaped, scenarioCase.expected.escaped);
  },

  'patch-subclass': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const operation = requiredValue(input, 'operation');
    const p = StrictPatch.create(operation);
    assert.ok(p instanceof StrictPatch);
    assert.ok(p instanceof Patch);
    assert.equal(Reflect.get(p, 'isStrict'), scenarioCase.expected.isStrict);
    const base = Patch.create(operation);
    assert.ok(base instanceof Patch);
    assert.ok(!(base instanceof StrictPatch));
    const target: Record<string, unknown> = {};
    StrictPatch.create({ op: 'add', path: '/key', value: requireJsonObject(requiredValue(input, 'target'), 'patch subclass target').key }).apply(target);
    assert.deepEqual(target, input.target);
  },

  'patch-root-and-errors': (scenarioCase) => {
    const input = readJson(scenarioCase);
    for (const path of requireArray(requiredValue(input, 'rootPaths'), 'patch root paths')) {
      const target: Record<string, unknown> = { a: 1 };
      Patch.create({ op: 'add', path, value: 2 }).apply(target);
      Patch.create({ op: 'replace', path, value: 3 }).apply(target);
      Patch.create({ op: 'remove', path }).apply(target);
      assert.deepEqual(target, scenarioCase.expected.rootNoop);
    }
    assert.throws(() => PatchOperationsEntity.intake(['not-operation']), SchemaIntakeError);
    assert.throws(() => PatchOperationsEntity.intake([null]), SchemaIntakeError);
    assert.throws(() => PatchOperationsEntity.intake([42]), SchemaIntakeError);
    assert.throws(() => Patch.create({ op: 'add', path: input.invalidPath, value: 1 }).apply({}), PatchError);
    assert.throws(() => Patch.create({ op: 'add', path: input.nonTraversableAddPath, value: 1 }).apply({ a: 1 }), PatchError);
    assert.throws(() => Patch.create({ op: 'test', path: input.primitiveTestPath, value: 1 }).apply({ a: 1 }), PatchError);
    assert.throws(() => Patch.create({ op: 'remove', path: input.missingRemovePath }).apply({}), PatchError);
    assert.throws(() => Patch.create({ op: 'remove', path: input.nonObjectRemovePath }).apply({ a: 1 }), PatchError);
    assert.throws(() => PatchOperationsEntity.intake([{ 'op': 'copy', 'path': '/copy' }]), SchemaIntakeError);
    assert.throws(() => PatchOperationsEntity.intake([{ 'op': 'move', 'path': '/move' }]), SchemaIntakeError);
  },

  'patch-array-remove-numeric': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const target = cloneJsonObject(requiredValue(input, 'target'), 'patch array remove target');
    Patch.create(requiredValue(input, 'operation')).apply(target);
    assert.deepEqual(target, scenarioCase.expected.target);
  },

  'patch-to-string-all-ops': (scenarioCase) => {
    const text = Patch.create(requiredValue(readJson(scenarioCase), 'operations')).toString();
    assertContainsAll(text, scenarioCase.expected.contains, 'patch toString all ops contains');
  },

  'path-access': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const pointers = requireArray(requiredValue(input, 'pointers'), 'path access pointers');
    const expected = requireArray(scenarioCase.expected.access, 'path access expected');
    assert.equal(pointers.length, expected.length);
    for (let index = 0; index < pointers.length; index += 1) {
      assert.equal(Path.toAccess(requireString(pointers[index], `path access pointer ${index}`)), expected[index]);
    }
  },

  'path-get': (scenarioCase) => {
    const obj = requireJsonObject(requiredValue(readJson(scenarioCase), 'object'), 'path get object');
    const objJson = JsonValueEntity.intake(obj);
    const getScenarios: Array<[string, unknown]> = [
      ['user', obj.user],
      ['user.name', 'Alice'],
      ['user.address.city', 'Wonderland'],
      ['user.tags[0]', 'admin'],
      ['user.tags[1]', 'user'],
      ['user.missing', undefined],
      ['missing.path', undefined],
      ['__proto__', undefined],
      ['constructor', undefined],
      ['', objJson]
    ];
    for (const [path, expected] of getScenarios) {
      assert.deepEqual(Path.get(objJson, path), expected);
    }
    assert.equal(Path.get(objJson, 'user.address.city', { maximumDepth: 1 }), undefined);
    const result = Path.get(objJson, 'items[*]');
    assert.ok(result !== null && typeof result === 'object');
    assert.equal(Reflect.get(result, 'isWildcard'), scenarioCase.expected.wildcard);
    assert.deepEqual(Reflect.get(result, 'array'), obj.items);
    const target: Record<string, unknown> = {};
    const targetJson = JsonValueEntity.intake(target);
    assert.equal(Path.get(targetJson, '["__proto__"]["polluted"]'), undefined);
    assert.equal(Path.get(targetJson, '["constructor"]["prototype"]'), undefined);
    assert.equal(Path.get(targetJson, '["prototype"]'), undefined);
    const safe = { 'special.key': { nested: 'value' } };
    assert.equal(Path.get(JsonValueEntity.intake(safe), '["special.key"]["nested"]'), 'value');
    assert.equal(Path.get(objJson, 'user.tags[oops]'), undefined);
    assert.equal(Path.get(objJson, 'user.tags[1.5]'), undefined);
    assert.equal(Path.get(objJson, 'user.tags[-1]'), undefined);
    assert.equal(Path.get(objJson, 'user.tags[0]'), 'admin');
  },

  'path-subclass': (scenarioCase) => {
    const obj = cloneJsonObject(requiredValue(readJson(scenarioCase), 'object'), 'path subclass object');
    const objJson = JsonValueEntity.intake(obj);
    assert.equal(Path.get(objJson, '__secret'), undefined);
    assert.equal(OpenPath.get(objJson, '__secret'), obj['__secret']);
    assert.equal(Path.get(objJson, 'layer.__inner'), undefined);
    assert.equal(OpenPath.get(objJson, 'layer.__inner'), requireJsonObject(obj.layer, 'path subclass layer')['__inner']);
  }
} satisfies Record<ScenarioShape, ScenarioRunner>;

const scenarioCases = scenarioGroups.cases.map(normalizeScenarioCase);

function normalizeScenarioCase(scenarioCase: ImportedScenarioCase): ScenarioCase {
  return {
    description: scenarioCase.description,
    expected: scenarioCase.expected,
    input: scenarioCase.input,
    shape: requireScenarioShape(scenarioCase.shape),
    name: scenarioCase.name
  };
}

function isScenarioShape(shape: string): shape is ScenarioShape {
  return Object.hasOwn(scenarioRunnerMap, shape);
}

function requireScenarioShape(shape: string): ScenarioShape {
  if (isScenarioShape(shape)) {
    return shape;
  }

  throw new Error(`Unhandled json behavior scenario shape: ${shape}`);
}

function readJson(scenarioCase: ScenarioCase): JsonObject {
  return scenarioCase.input.json;
}

function isJsonObject<T>(value: T): value is T & JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireJsonObject<T>(value: T, context: string): JsonObject {
  if (isJsonObject(value)) {
    return value;
  }

  throw new TypeError(`Expected object for ${context}`);
}

function cloneJsonObject<T>(value: T, context: string): JsonObject {
  return structuredClone(requireJsonObject(value, context));
}

function requireArray<T>(value: T, context: string): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  throw new TypeError(`Expected array for ${context}`);
}

function requireString<T>(value: T, context: string): string {
  if (typeof value === 'string') {
    return value;
  }

  throw new TypeError(`Expected string for ${context}`);
}

function requireNumber<T>(value: T, context: string): number {
  if (typeof value === 'number') {
    return value;
  }

  throw new TypeError(`Expected number for ${context}`);
}

function requiredValue(record: JsonObject, key: string): unknown {
  if (Reflect.has(record, key)) {
    return Reflect.get(record, key);
  }

  throw new TypeError(`Missing scenario value: ${key}`);
}

function applyJsonMutation(target: JsonObject, mutation: JsonObject): void {
  for (const [key, value] of Object.entries(mutation)) {
    const current = Reflect.get(target, key);
    if (isJsonObject(current) && isJsonObject(value)) {
      applyJsonMutation(current, value);
    } else {
      Reflect.set(target, key, structuredClone(value));
    }
  }
}

function requireInvalidPatchValueShape<T>(value: T): InvalidPatchValueShape {
  if (value === 'bigint') return 'bigint';
  if (value === 'cycle') return 'cycle';
  if (value === 'function') return 'function';
  if (value === 'infinity') return 'infinity';
  if (value === 'nan') return 'nan';
  if (value === 'symbol') return 'symbol';

  throw new TypeError(`Unknown invalid patch value shape: ${String(value)}`);
}

function assertContainsAll<T>(text: string, expectedValues: T, context: string): void {
  for (const expectedText of requireArray(expectedValues, context)) {
    assert.ok(text.includes(requireString(expectedText, context)));
  }
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await scenarioRunnerMap[scenarioCase.shape](scenarioCase);
}

void describe('JSON behavior', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});

void describe('Draft runtime value pass-through', () => {
  void it('preserves Date, Map, Set, and class instance references while drafting a sibling', () => {
    const createdAt = new Date(1);
    const tags = new Set(['primary']);
    const attributes = new Map([['status', 'active']]);
    const widget = new Widget('widget-1');
    const next = Draft.produce({ attributes, createdAt, tags, widget, 'label': 'before' }, (draft) => {
      draft.label = 'after';
    });
    assert.strictEqual(next.createdAt, createdAt);
    assert.strictEqual(next.tags, tags);
    assert.strictEqual(next.attributes, attributes);
    assert.strictEqual(next.widget, widget);
    assert.equal(next.label, 'after');
  });
});
