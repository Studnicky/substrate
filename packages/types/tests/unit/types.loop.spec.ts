import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Empty } from '../../src/guards/Empty.js';
import { JsonObject } from '../../src/guards/JsonObject.js';
import { JsonValue } from '../../src/guards/JsonValue.js';
import { PickDefined } from '../../src/objects/PickDefined.js';
import { Predicates } from '../../src/predicates/Predicates.js';

import scenarioGroups from './types.scenarios.json' with { type: 'json' };

type Scenario = {
  readonly description: string;
  readonly input?: unknown;
  readonly outcome: unknown;
};

type InputExecutor = (input: unknown) => unknown;
type MarkerMaterializer = () => unknown;
type OutcomeAssertion = (actual: unknown) => void;
type ScenarioExecutor = (scenario: Scenario) => void;

type MaterializeMarkers = {
  readonly abortSignal: MarkerMaterializer;
  readonly arrayBufferView: MarkerMaterializer;
  readonly asyncIterable: MarkerMaterializer;
  readonly bigint: MarkerMaterializer;
  readonly blob: MarkerMaterializer;
  readonly cyclicObject: MarkerMaterializer;
  readonly date: MarkerMaterializer;
  readonly error: MarkerMaterializer;
  readonly formData: MarkerMaterializer;
  readonly function: MarkerMaterializer;
  readonly headers: MarkerMaterializer;
  readonly infinity: MarkerMaterializer;
  readonly iterable: MarkerMaterializer;
  readonly map: MarkerMaterializer;
  readonly mapWithEntry: MarkerMaterializer;
  readonly namedFunction: MarkerMaterializer;
  readonly nan: MarkerMaterializer;
  readonly negativeInfinity: MarkerMaterializer;
  readonly null: MarkerMaterializer;
  readonly nullPrototypeObject: MarkerMaterializer;
  readonly readableStream: MarkerMaterializer;
  readonly regex: MarkerMaterializer;
  readonly request: MarkerMaterializer;
  readonly response: MarkerMaterializer;
  readonly set: MarkerMaterializer;
  readonly setWithEntry: MarkerMaterializer;
  readonly symbol: MarkerMaterializer;
  readonly thenable: MarkerMaterializer;
  readonly undefined: MarkerMaterializer;
  readonly url: MarkerMaterializer;
  readonly urlSearchParams: MarkerMaterializer;
};

function named(): void {}

const materializeMarkers = {
  abortSignal: () => new AbortController().signal,
  arrayBufferView: () => new Uint8Array([1, 2, 3]),
  asyncIterable: () => ({ [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true, value: undefined }) }) }),
  bigint: () => 9007199254740993n,
  blob: () => new Blob(['payload']),
  cyclicObject: () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    return cyclic;
  },
  date: () => new Date(0),
  error: () => {
    try {
      JSON.parse('{');
    } catch (error) {
      return error;
    }
    return assert.fail('Expected JSON.parse() to throw for invalid JSON.');
  },
  formData: () => new FormData(),
  function: () => () => {},
  headers: () => new Headers(),
  infinity: () => Number.POSITIVE_INFINITY,
  iterable: () => [1, 2, 3],
  map: () => new Map(),
  mapWithEntry: () => new Map([['a', 1]]),
  namedFunction: () => named,
  nan: () => Number.NaN,
  negativeInfinity: () => Number.NEGATIVE_INFINITY,
  null: () => null,
  nullPrototypeObject: () => Object.create(null),
  readableStream: () => new ReadableStream(),
  regex: () => /value/u,
  request: () => new Request('https://example.test'),
  response: () => new Response(),
  set: () => new Set(),
  setWithEntry: () => new Set([1]),
  symbol: () => Symbol('s'),
  thenable: () => {
    const value: Record<string, unknown> = {};
    Reflect.set(value, 'then', () => {});
    return value;
  },
  undefined: () => undefined,
  url: () => new URL('https://example.test'),
  urlSearchParams: () => new URLSearchParams()
} satisfies MaterializeMarkers;

type OutcomeAssertions = {
  readonly date: OutcomeAssertion;
  readonly function: OutcomeAssertion;
  readonly map: OutcomeAssertion;
  readonly nan: OutcomeAssertion;
  readonly null: OutcomeAssertion;
  readonly regex: OutcomeAssertion;
  readonly set: OutcomeAssertion;
  readonly undefined: OutcomeAssertion;
};

const outcomeAssertions = {
  date: (actual) => {
    assert.ok(actual instanceof Date);
  },
  function: (actual) => {
    assert.equal(typeof actual, 'function');
  },
  map: (actual) => {
    assert.ok(actual instanceof Map);
    assert.equal(actual.size, 0);
  },
  nan: (actual) => {
    assert.ok(Number.isNaN(actual));
  },
  null: (actual) => {
    assert.strictEqual(actual, null);
  },
  regex: (actual) => {
    assert.ok(actual instanceof RegExp);
  },
  set: (actual) => {
    assert.ok(actual instanceof Set);
    assert.equal(actual.size, 0);
  },
  undefined: (actual) => {
    assert.strictEqual(actual, undefined);
  }
} satisfies OutcomeAssertions;

function hasOwnKey<ObjectValue extends object>(value: ObjectValue, key: PropertyKey): key is keyof ObjectValue {
  return Object.hasOwn(value, key);
}

function getMappedValue<ValueMap extends object>(
  valueMap: ValueMap,
  key: PropertyKey,
  label: string
): ValueMap[keyof ValueMap] {
  if (hasOwnKey(valueMap, key)) {
    return valueMap[key];
  }
  return assert.fail(`Unknown ${label}: ${String(key)}`);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function materialize(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => materialize(entry));
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  if (isObjectRecord(value) && 'shape' in value) {
    const markerShape = value.shape;
    if (typeof markerShape === 'string' && hasOwnKey(materializeMarkers, markerShape)) {
      return materializeMarkers[markerShape]();
    }
  }

  if (isObjectRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = materialize(entry);
    }
    return result;
  }
  return value;
}

function expectOutcome(actual: unknown, expected: unknown): void {
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual));
    assert.equal(actual.length, expected.length);
    for (let index = 0; index < expected.length; index += 1) {
      expectOutcome(actual[index], expected[index]);
    }
    return;
  }

  if (isObjectRecord(expected) && 'shape' in expected) {
    const markerShape = expected.shape;
    if (typeof markerShape === 'string' && hasOwnKey(outcomeAssertions, markerShape)) {
      outcomeAssertions[markerShape](actual);
      return;
    }
  }

  if (isObjectRecord(expected) && !Array.isArray(expected)) {
    assert.ok(isObjectRecord(actual));
    assert.deepStrictEqual(Object.keys(actual).toSorted(), Object.keys(expected).toSorted());
    for (const [key, value] of Object.entries(expected)) {
      expectOutcome(actual[key], value);
    }
    return;
  }

  assert.strictEqual(actual, expected);
}

type GuardExecutors = {
  readonly [GroupName in keyof typeof scenarioGroups.guard]: InputExecutor;
};

const guardExecutors = {
  asNumber: (input) => Predicates.asNumber(input),
  asRecordArray: (input) => Predicates.asRecordArray(input),
  asStringOrNull: (input) => Predicates.asStringOrNull(input),
  isAbortSignal: (input) => Predicates.isAbortSignal(input),
  isArray: (input) => Predicates.isArray(input),
  isArrayBufferView: (input) => Predicates.isArrayBufferView(input),
  isAsyncIterable: (input) => Predicates.isAsyncIterable(input),
  isBigInt: (input) => Predicates.isBigInt(input),
  isBlob: (input) => Predicates.isBlob(input),
  isBoolean: (input) => Predicates.isBoolean(input),
  isDate: (input) => Predicates.isDate(input),
  isError: (input) => Predicates.isError(input),
  isFormData: (input) => Predicates.isFormData(input),
  isFunction: (input) => Predicates.isFunction(input),
  isHeaders: (input) => Predicates.isHeaders(input),
  isIterable: (input) => Predicates.isIterable(input),
  isMap: (input) => Predicates.isMap(input),
  isNonNegativeInteger: (input) => Predicates.isNonNegativeInteger(input),
  isNullish: (input) => Predicates.isNullish(input),
  isNumber: (input) => Predicates.isNumber(input),
  isObject: (input) => Predicates.isObject(input),
  isObjectLike: (input) => Predicates.isObjectLike(input),
  isPlainObject: (input) => Predicates.isPlainObject(input),
  isPositiveInteger: (input) => Predicates.isPositiveInteger(input),
  isReadableStream: (input) => Predicates.isReadableStream(input),
  isRecord: (input) => Predicates.isRecord(input),
  isRegExp: (input) => Predicates.isRegExp(input),
  isRequest: (input) => Predicates.isRequest(input),
  isResponse: (input) => Predicates.isResponse(input),
  isSet: (input) => Predicates.isSet(input),
  isString: (input) => Predicates.isString(input),
  isSymbol: (input) => Predicates.isSymbol(input),
  isThenable: (input) => Predicates.isThenable(input),
  isURL: (input) => Predicates.isURL(input),
  isURLSearchParams: (input) => Predicates.isURLSearchParams(input)
} satisfies GuardExecutors;

type EmptyExecutors = {
  readonly array: ScenarioExecutor;
  readonly arrayIdentity: ScenarioExecutor;
  readonly isArray: ScenarioExecutor;
  readonly isMap: ScenarioExecutor;
  readonly isObject: ScenarioExecutor;
  readonly isSet: ScenarioExecutor;
  readonly isString: ScenarioExecutor;
  readonly map: ScenarioExecutor;
  readonly mapIdentity: ScenarioExecutor;
  readonly object: ScenarioExecutor;
  readonly objectIdentity: ScenarioExecutor;
  readonly set: ScenarioExecutor;
  readonly setIdentity: ScenarioExecutor;
  readonly string: ScenarioExecutor;
};

const emptyExecutors = {
  array: (scenario) => {
    expectOutcome(Empty.array(), scenario.outcome);
  },
  arrayIdentity: (scenario) => {
    expectOutcome(Empty.array() !== Empty.array(), scenario.outcome);
  },
  isArray: (scenario) => {
    expectOutcome(Predicates.isEmptyArray(materialize(scenario.input)), scenario.outcome);
  },
  isMap: (scenario) => {
    expectOutcome(Predicates.isEmptyMap(materialize(scenario.input)), scenario.outcome);
  },
  isObject: (scenario) => {
    expectOutcome(Predicates.isEmptyPlainObject(materialize(scenario.input)), scenario.outcome);
  },
  isSet: (scenario) => {
    expectOutcome(Predicates.isEmptySet(materialize(scenario.input)), scenario.outcome);
  },
  isString: (scenario) => {
    expectOutcome(Predicates.isEmptyString(materialize(scenario.input)), scenario.outcome);
  },
  map: (scenario) => {
    expectOutcome(Empty.map(), scenario.outcome);
  },
  mapIdentity: (scenario) => {
    expectOutcome(Empty.map() !== Empty.map(), scenario.outcome);
  },
  object: (scenario) => {
    expectOutcome(Empty.object(), scenario.outcome);
  },
  objectIdentity: (scenario) => {
    expectOutcome(Empty.object() !== Empty.object(), scenario.outcome);
  },
  set: (scenario) => {
    expectOutcome(Empty.set(), scenario.outcome);
  },
  setIdentity: (scenario) => {
    expectOutcome(Empty.set() !== Empty.set(), scenario.outcome);
  },
  string: (scenario) => {
    expectOutcome(Empty.string(), scenario.outcome);
  }
} satisfies EmptyExecutors;

type JsonValueExecutors = {
  readonly from: ScenarioExecutor;
  readonly is: ScenarioExecutor;
};

const jsonValueExecutors = {
  from: (scenario) => {
    expectOutcome(JsonValue.from(materialize(scenario.input)), scenario.outcome);
  },
  is: (scenario) => {
    expectOutcome(JsonValue.is(materialize(scenario.input)), scenario.outcome);
  }
} satisfies JsonValueExecutors;

for (const [groupName, groupValue] of Object.entries(scenarioGroups.guard)) {
  const execute = getMappedValue(guardExecutors, groupName, 'Predicates scenario group');
  void describe(`Predicates.${groupName}`, () => {
    for (const scenario of groupValue) {
      void it(scenario.description, () => {
        const input = materialize(scenario.input);
        expectOutcome(execute(input), scenario.outcome);
      });
    }
  });
}

void describe('Empty', () => {
  for (const scenario of scenarioGroups.empty) {
    const execute = getMappedValue(emptyExecutors, scenario.method, 'Empty scenario method');
    void it(scenario.description, () => {
      execute(scenario);
    });
  }
});

void describe('JsonObject', () => {
  for (const scenario of scenarioGroups.jsonObject) {
    void it(scenario.description, () => {
      const input = materialize(scenario.input);
      expectOutcome(JsonObject.is(input), scenario.outcome);
    });
  }
});

void describe('JsonValue', () => {
  for (const scenario of scenarioGroups.jsonValue) {
    const execute = getMappedValue(jsonValueExecutors, scenario.method, 'JsonValue scenario method');
    void it(scenario.description, () => {
      execute(scenario);
    });
  }
});

void describe('PickDefined', () => {
  for (const scenario of scenarioGroups.pickDefined) {
    void it(scenario.description, () => {
      const input = materialize(scenario.input);
      assert.ok(isObjectRecord(input) && !Array.isArray(input));
      expectOutcome(PickDefined.from(input), scenario.outcome);
    });
  }
});

void describe('Predicates.areNaNStrict', () => {
  void it('returns false when either operand is NaN', () => {
    assert.equal(Predicates.areNaNStrict(Number.NaN, Number.NaN), false);
    assert.equal(Predicates.areNaNStrict(Number.NaN, 1), false);
    assert.equal(Predicates.areNaNStrict(1, Number.NaN), false);
  });

  void it('falls through to strict equality when neither operand is NaN', () => {
    assert.equal(Predicates.areNaNStrict(1, 1), true);
    assert.equal(Predicates.areNaNStrict(1, 2), false);
    assert.equal(Predicates.areNaNStrict('a', 'a'), true);
  });
});

void describe('Predicates.areSetsEqual', () => {
  void it('compares by membership, ignoring insertion order', () => {
    assert.equal(Predicates.areSetsEqual(new Set([1, 2, 3]), new Set([3, 2, 1])), true);
    assert.equal(Predicates.areSetsEqual(new Set([1, 2, 3]), new Set([1, 2])), false);
    assert.equal(Predicates.areSetsEqual(new Set([1, 2, 3]), new Set([1, 2, 4])), false);
    assert.equal(Predicates.areSetsEqual(new Set(), new Set()), true);
  });
});

void describe('Predicates.areObjectsEqual with nested Sets', () => {
  void it('does not silently treat two different Sets as equal via the zero-own-keys fallback', () => {
    assert.equal(Predicates.areObjectsEqual({ 'tags': new Set([1, 2, 3]) }, { 'tags': new Set([4, 5, 6]) }), false);
    assert.equal(Predicates.areObjectsEqual({ 'tags': new Set([1, 2, 3]) }, { 'tags': new Set([1, 2, 3]) }), true);
  });
});

void describe('Predicates subclass override', () => {
  class LaxPredicates extends Predicates {
    public static override isObject<T>(value: T): value is T & Record<string, unknown> {
      return typeof value === 'object' && value !== null;
    }
  }

  void it('overridden isObject accepts arrays', () => {
    assert.equal(LaxPredicates.isObject([1, 2, 3]), true);
    assert.equal(LaxPredicates.isObject(null), false);
    assert.equal(LaxPredicates.isObject({}), true);
  });

  void it('asRecordArray delegates through overridden isObject — nested arrays pass filter', () => {
    const input: unknown[] = [[1, 2], { a: 1 }, 'skip-me', null];
    const result = LaxPredicates.asRecordArray(input);

    assert.ok(result !== undefined);
    assert.equal(result.length, 2);
    assert.deepEqual(result[0], [1, 2]);
    assert.deepEqual(result[1], { a: 1 });
  });

  void it('base Predicates.isObject is unchanged — arrays are not records', () => {
    assert.equal(Predicates.isObject([1, 2, 3]), false);
  });
});
