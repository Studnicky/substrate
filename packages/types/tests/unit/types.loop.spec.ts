import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { TypesScenarioCaseEntity } from '../../../../scripts/test-helpers/scenario-kit/dist/types-fixtures/TypesScenarioCaseEntity.js';
import { BaseError } from '../../src/errors/BaseError.js';
import { Empty } from '../../src/guards/Empty.js';
import { JsonObject } from '../../src/guards/JsonObject.js';
import { JsonValue } from '../../src/guards/JsonValue.js';
import { Predicates } from '../../src/predicates/Predicates.js';
import { PATTERN_FIXTURES } from '../fixtures/PATTERN_FIXTURES.js';
import scenarioGroups from './types.scenarios.json' with { 'type': 'json' };

class TypesFixtureError extends BaseError {
  public override readonly name: string = 'TypesFixtureError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'types.testFixtureFailed',
      'message': message,
      'retryable': false
    });
  }
}

interface MarkerFactoryInterface {
  (): unknown;
}

interface OutcomeAssertionInterface {
  (actual: unknown): void;
}

interface VerdictPredicateInterface {
  (value: unknown): boolean;
}

/** Boolean-verdict views of the DOM guards; their narrowed types carry library `any`, and the runners compare only the verdict. */
class VerdictPredicates {
  static readonly isAbortSignal: VerdictPredicateInterface = Predicates.isAbortSignal;
  static readonly isAsyncIterable: VerdictPredicateInterface = Predicates.isAsyncIterable;
  static readonly isBlob: VerdictPredicateInterface = Predicates.isBlob;
  static readonly isFormData: VerdictPredicateInterface = Predicates.isFormData;
  static readonly isHeaders: VerdictPredicateInterface = Predicates.isHeaders;
  static readonly isIterable: VerdictPredicateInterface = Predicates.isIterable;
  static readonly isReadableStream: VerdictPredicateInterface = Predicates.isReadableStream;
  static readonly isRequest: VerdictPredicateInterface = Predicates.isRequest;
  static readonly isResponse: VerdictPredicateInterface = Predicates.isResponse;
  static readonly isURL: VerdictPredicateInterface = Predicates.isURL;
  static readonly isURLSearchParams: VerdictPredicateInterface = Predicates.isURLSearchParams;
}

/** Runtime-value markers (`{ "shape": "<name>" }`) materialized from JSON scenario data, and the outcome assertions that match them. */
class TypesFixtures {
  static readonly markerFactories: ReadonlyMap<string, MarkerFactoryInterface> = new Map<
    string,
    MarkerFactoryInterface
  >([
    ['abortSignal', TypesFixtures.abortSignalMarker],
    [
      'arrayBufferView',
      () => {
        return new Uint8Array([1, 2, 3]);
      }
    ],
    ['asyncIterable', TypesFixtures.asyncIterableMarker],
    [
      'bigint',
      () => {
        return 9007199254740993n;
      }
    ],
    [
      'blob',
      () => {
        return new Blob(['payload']);
      }
    ],
    ['cyclicObject', TypesFixtures.cyclicObjectMarker],
    [
      'date',
      () => {
        return new Date(0);
      }
    ],
    ['error', TypesFixtures.errorMarker],
    [
      'formData',
      () => {
        return new FormData();
      }
    ],
    [
      'function',
      () => {
        return () => {};
      }
    ],
    [
      'headers',
      () => {
        return new Headers();
      }
    ],
    [
      'infinity',
      () => {
        return Number.POSITIVE_INFINITY;
      }
    ],
    [
      'iterable',
      () => {
        return [1, 2, 3];
      }
    ],
    [
      'map',
      () => {
        return new Map();
      }
    ],
    [
      'mapWithEntries',
      () => {
        return new Map([
          ['a', 1],
          ['b', 2]
        ]);
      }
    ],
    [
      'mapWithEntry',
      () => {
        return new Map([['a', 1]]);
      }
    ],
    [
      'namedFunction',
      () => {
        return TypesFixtures.named;
      }
    ],
    [
      'nan',
      () => {
        return Number.NaN;
      }
    ],
    [
      'negativeInfinity',
      () => {
        return Number.NEGATIVE_INFINITY;
      }
    ],
    [
      'null',
      () => {
        return null;
      }
    ],
    [
      'nullPrototypeObject',
      () => {
        const bare: unknown = Object.create(null);
        return bare;
      }
    ],
    [
      'readableStream',
      () => {
        return new ReadableStream();
      }
    ],
    [
      'regex',
      () => {
        return PATTERN_FIXTURES.value;
      }
    ],
    [
      'request',
      () => {
        return new Request('https://example.test');
      }
    ],
    [
      'response',
      () => {
        return new Response();
      }
    ],
    [
      'set',
      () => {
        return new Set();
      }
    ],
    [
      'setWithEntry',
      () => {
        return new Set([1]);
      }
    ],
    [
      'symbol',
      () => {
        const marker = Symbol('s');
        return marker;
      }
    ],
    ['thenable', TypesFixtures.thenableMarker],
    [
      'undefined',
      () => {
        return undefined;
      }
    ],
    ['url', TypesFixtures.urlMarker],
    [
      'urlSearchParams',
      () => {
        return new URLSearchParams();
      }
    ]
  ]);

  static readonly outcomeAssertions: ReadonlyMap<string, OutcomeAssertionInterface> = new Map<
    string,
    OutcomeAssertionInterface
  >([
    [
      'date',
      (actual) => {
        assert.ok(actual instanceof Date);
      }
    ],
    [
      'function',
      (actual) => {
        assert.equal(typeof actual, 'function');
      }
    ],
    [
      'map',
      (actual) => {
        assert.ok(actual instanceof Map);
        assert.equal(actual.size, 0);
      }
    ],
    [
      'nan',
      (actual) => {
        assert.ok(Number.isNaN(actual));
      }
    ],
    [
      'null',
      (actual) => {
        assert.strictEqual(actual, null);
      }
    ],
    [
      'regex',
      (actual) => {
        assert.ok(actual instanceof RegExp);
      }
    ],
    [
      'set',
      (actual) => {
        assert.ok(actual instanceof Set);
        assert.equal(actual.size, 0);
      }
    ],
    [
      'undefined',
      (actual) => {
        assert.strictEqual(actual, undefined);
      }
    ]
  ]);

  static expectOutcome(actual: unknown, expected: unknown): void {
    if (Array.isArray(expected)) {
      TypesFixtures.expectArrayOutcome(actual, expected);
    } else if (TypesFixtures.isMarkedOutcome(expected)) {
      TypesFixtures.requireOutcomeAssertion(expected.shape)(actual);
    } else if (TypesFixtures.isObjectRecord(expected)) {
      TypesFixtures.expectRecordOutcome(actual, expected);
    } else {
      assert.strictEqual(actual, expected);
    }
  }

  static freshPattern(pattern: RegExp): RegExp {
    try {
      const fresh = new RegExp(pattern.source, pattern.flags);
      return fresh;
    } catch (cause) {
      throw new TypesFixtureError('Fixture pattern did not rebuild', cause);
    }
  }

  static named(): void {}

  static isEntryIterable(value: unknown): value is Iterable<readonly [string, unknown]> {
    const result = typeof value === 'object' && value !== null && Symbol.iterator in value;
    return result;
  }

  static materialize(value: unknown): unknown {
    let result: unknown = value;
    if (Array.isArray(value)) {
      result = TypesFixtures.materializeArray(value);
    } else if (TypesFixtures.isMarkedValue(value)) {
      result = TypesFixtures.requireMarkerFactory(value.shape)();
    } else if (TypesFixtures.isObjectRecord(value)) {
      result = TypesFixtures.materializeRecord(value);
    }
    return result;
  }

  private static abortSignalMarker(): unknown {
    const controller = new AbortController();
    const signal = controller.signal;
    return signal;
  }

  private static asyncIterableMarker(): unknown {
    const iterable = {
      [Symbol.asyncIterator]: () => {
        const iterator = {
          'next': () => {
            const step = Promise.resolve({ 'done': true, 'value': undefined });
            return step;
          }
        };
        return iterator;
      }
    };
    return iterable;
  }

  private static cyclicObjectMarker(): unknown {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    return cyclic;
  }

  private static errorMarker(): unknown {
    try {
      JSON.parse('{');
    } catch (error) {
      return error;
    }
    const failure = assert.fail('Expected JSON.parse() to throw for invalid JSON.');
    return failure;
  }

  private static expectArrayOutcome(actual: unknown, expected: readonly unknown[]): void {
    assert.ok(Array.isArray(actual));
    assert.equal(actual.length, expected.length);
    for (let index = 0; index < expected.length; index += 1) {
      TypesFixtures.expectOutcome(actual[index], expected[index]);
    }
  }

  private static expectRecordOutcome(actual: unknown, expected: Record<string, unknown>): void {
    assert.ok(TypesFixtures.isObjectRecord(actual));
    assert.deepStrictEqual(Object.keys(actual).toSorted(), Object.keys(expected).toSorted());
    const entries = Object.entries(expected);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      assert.ok(entry !== undefined);
      TypesFixtures.expectOutcome(Reflect.get(actual, entry[0]), entry[1]);
    }
  }

  private static isMarkedOutcome(value: unknown): value is { 'shape': string } {
    const marked =
      TypesFixtures.isObjectRecord(value) &&
      typeof value.shape === 'string' &&
      TypesFixtures.outcomeAssertions.has(value.shape);
    return marked;
  }

  private static isMarkedValue(value: unknown): value is { 'shape': string } {
    const marked =
      TypesFixtures.isObjectRecord(value) &&
      typeof value.shape === 'string' &&
      TypesFixtures.markerFactories.has(value.shape);
    return marked;
  }

  private static isObjectRecord(value: unknown): value is Record<string, unknown> {
    const result = typeof value === 'object' && value !== null && !Array.isArray(value);
    return result;
  }

  private static materializeArray(values: readonly unknown[]): unknown[] {
    const result: unknown[] = [];
    for (let index = 0; index < values.length; index += 1) {
      result.push(TypesFixtures.materialize(values[index]));
    }
    return result;
  }

  private static materializeRecord(value: Record<string, unknown>): Record<string, unknown> {
    const pairs: (readonly [string, unknown])[] = [];
    const entries = Object.entries(value);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      assert.ok(entry !== undefined);
      pairs.push([entry[0], TypesFixtures.materialize(entry[1])]);
    }
    const result = JsonObject.fromEntries(pairs);
    return result;
  }

  private static requireMarkerFactory(shape: string): MarkerFactoryInterface {
    const factory = TypesFixtures.markerFactories.get(shape);
    assert.ok(factory !== undefined, `Unknown value marker: ${shape}`);
    return factory;
  }

  private static requireOutcomeAssertion(shape: string): OutcomeAssertionInterface {
    const assertion = TypesFixtures.outcomeAssertions.get(shape);
    assert.ok(assertion !== undefined, `Unknown outcome marker: ${shape}`);
    return assertion;
  }

  private static thenableMarker(): unknown {
    const value: Record<string, unknown> = {};
    Reflect.set(value, 'then', () => {});
    return value;
  }

  private static urlMarker(): unknown {
    try {
      const url = new URL('https://example.test');
      return url;
    } catch (cause) {
      throw new TypesFixtureError('Fixture URL did not parse', cause);
    }
  }
}

class TypesRunners {
  static asNumber(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'asNumber'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.asNumber(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static asStringOrNull(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'asStringOrNull'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.asStringOrNull(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static asRecordArray(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'asRecordArray'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.asRecordArray(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isString(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isString'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isString(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isNumber(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isNumber'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isNumber(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isBoolean(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isBoolean'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isBoolean(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isFunction(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isFunction'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isFunction(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isObject(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isObject'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isObject(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isNonNegativeInteger(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isNonNegativeInteger'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isNonNegativeInteger(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isPositiveInteger(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isPositiveInteger'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isPositiveInteger(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isArray(scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isArray'>): void {
    TypesFixtures.expectOutcome(
      Predicates.isArray(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isDate(scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isDate'>): void {
    TypesFixtures.expectOutcome(
      Predicates.isDate(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isError(scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isError'>): void {
    TypesFixtures.expectOutcome(
      Predicates.isError(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isMap(scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isMap'>): void {
    TypesFixtures.expectOutcome(
      Predicates.isMap(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isSet(scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isSet'>): void {
    TypesFixtures.expectOutcome(
      Predicates.isSet(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isObjectLike(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isObjectLike'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isObjectLike(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isRecord(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isRecord'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isRecord(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isPlainObject(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isPlainObject'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isPlainObject(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isNullish(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isNullish'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isNullish(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isRegExp(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isRegExp'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isRegExp(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isSymbol(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isSymbol'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isSymbol(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isBigInt(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isBigInt'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isBigInt(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isThenable(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isThenable'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isThenable(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isIterable(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isIterable'>
  ): void {
    TypesFixtures.expectOutcome(
      VerdictPredicates.isIterable(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isAsyncIterable(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isAsyncIterable'>
  ): void {
    TypesFixtures.expectOutcome(
      VerdictPredicates.isAsyncIterable(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isArrayBufferView(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isArrayBufferView'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isArrayBufferView(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isBlob(scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isBlob'>): void {
    TypesFixtures.expectOutcome(
      VerdictPredicates.isBlob(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isFormData(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isFormData'>
  ): void {
    TypesFixtures.expectOutcome(
      VerdictPredicates.isFormData(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isURL(scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isURL'>): void {
    TypesFixtures.expectOutcome(
      VerdictPredicates.isURL(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isURLSearchParams(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isURLSearchParams'>
  ): void {
    TypesFixtures.expectOutcome(
      VerdictPredicates.isURLSearchParams(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isHeaders(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isHeaders'>
  ): void {
    TypesFixtures.expectOutcome(
      VerdictPredicates.isHeaders(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isRequest(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isRequest'>
  ): void {
    TypesFixtures.expectOutcome(
      VerdictPredicates.isRequest(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isResponse(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isResponse'>
  ): void {
    TypesFixtures.expectOutcome(
      VerdictPredicates.isResponse(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isAbortSignal(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isAbortSignal'>
  ): void {
    TypesFixtures.expectOutcome(
      VerdictPredicates.isAbortSignal(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static isReadableStream(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'isReadableStream'>
  ): void {
    TypesFixtures.expectOutcome(
      VerdictPredicates.isReadableStream(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static 'empty-array'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-array'>
  ): void {
    TypesFixtures.expectOutcome(Empty.array(), scenarioCase.outcome);
  }

  static 'empty-arrayIdentity'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-arrayIdentity'>
  ): void {
    TypesFixtures.expectOutcome(Empty.array() !== Empty.array(), scenarioCase.outcome);
  }

  static 'empty-isArray'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-isArray'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isEmptyArray(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static 'empty-isMap'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-isMap'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isEmptyMap(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static 'empty-isObject'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-isObject'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isEmptyPlainObject(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static 'empty-isSet'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-isSet'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isEmptySet(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static 'empty-isString'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-isString'>
  ): void {
    TypesFixtures.expectOutcome(
      Predicates.isEmptyString(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static 'empty-map'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-map'>
  ): void {
    TypesFixtures.expectOutcome(Empty.map(), scenarioCase.outcome);
  }

  static 'empty-mapIdentity'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-mapIdentity'>
  ): void {
    TypesFixtures.expectOutcome(Empty.map() !== Empty.map(), scenarioCase.outcome);
  }

  static 'empty-object'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-object'>
  ): void {
    TypesFixtures.expectOutcome(Empty.object(), scenarioCase.outcome);
  }

  static 'empty-objectIdentity'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-objectIdentity'>
  ): void {
    TypesFixtures.expectOutcome(Empty.object() !== Empty.object(), scenarioCase.outcome);
  }

  static 'empty-set'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-set'>
  ): void {
    TypesFixtures.expectOutcome(Empty.set(), scenarioCase.outcome);
  }

  static 'empty-setIdentity'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-setIdentity'>
  ): void {
    TypesFixtures.expectOutcome(Empty.set() !== Empty.set(), scenarioCase.outcome);
  }

  static 'empty-string'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'empty-string'>
  ): void {
    TypesFixtures.expectOutcome(Empty.string(), scenarioCase.outcome);
  }

  static 'jsonObject-fromEntries'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'jsonObject-fromEntries'>
  ): void {
    const input = TypesFixtures.materialize(scenarioCase.input);
    assert.ok(TypesFixtures.isEntryIterable(input));
    TypesFixtures.expectOutcome(JsonObject.fromEntries(input), scenarioCase.outcome);
  }

  static 'jsonObject-is'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'jsonObject-is'>
  ): void {
    TypesFixtures.expectOutcome(
      JsonObject.is(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static 'jsonObject-write'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'jsonObject-write'>
  ): void {
    const input = TypesFixtures.materialize(scenarioCase.input);
    assert.ok(Predicates.isRecord(input));
    const target = input.target;
    const key = input.key;
    assert.ok(Predicates.isRecord(target));
    assert.ok(typeof key === 'string');
    const result = JsonObject.write(target, key, input.value);
    const prototypeIntact = Object.getPrototypeOf(target) === Object.prototype;
    TypesFixtures.expectOutcome(
      { 'prototypeIntact': prototypeIntact, 'result': result, 'target': target },
      scenarioCase.outcome
    );
  }

  static 'jsonValue-from'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'jsonValue-from'>
  ): void {
    TypesFixtures.expectOutcome(
      JsonValue.from(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }

  static 'jsonValue-is'(
    scenarioCase: ScenarioCaseOfType<TypesScenarioCaseEntity.Type, 'jsonValue-is'>
  ): void {
    TypesFixtures.expectOutcome(
      JsonValue.is(TypesFixtures.materialize(scenarioCase.input)),
      scenarioCase.outcome
    );
  }
}

ScenarioSuite.register({
  'entity': TypesScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Predicates, Empty, JsonObject, and JsonValue',
  'runners': TypesRunners
});

void describe('JsonObject.write', () => {
  void it('writes a string key onto a plain object and returns true', () => {
    const target: Record<string, unknown> = {};
    const returned = JsonObject.write(target, 'name', 'Ada');
    assert.equal(returned, true);
    assert.equal(target.name, 'Ada');
  });

  void it('writes a symbol key onto an existing target and returns true', () => {
    const marker = Symbol('marker');
    const target: Record<PropertyKey, unknown> = { 'existing': 1 };
    const returned = JsonObject.write(target, marker, 'tagged');
    assert.equal(returned, true);
    assert.equal(target[marker], 'tagged');
    assert.equal(target.existing, 1);
  });

  void it('writes a numeric index onto an existing array and returns true', () => {
    const target: unknown[] = ['a', 'b'];
    const returned = JsonObject.write(target, 1, 'z');
    assert.equal(returned, true);
    assert.deepStrictEqual(target, ['a', 'z']);
  });

  void it('returns false and leaves a frozen target unchanged, matching Reflect.set', () => {
    const target: Record<string, unknown> = Object.freeze({ 'locked': true });
    const returned = JsonObject.write(target, 'locked', false);
    assert.equal(returned, false);
    assert.equal(target.locked, true);
  });

  void it('rejects a __proto__ key and leaves the target prototype unchanged', () => {
    const target: Record<string, unknown> = {};
    const returned = JsonObject.write(target, '__proto__', { 'polluted': true });
    assert.equal(returned, false);
    assert.equal(Reflect.getPrototypeOf(target), Object.prototype);
  });
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

void describe('Predicates.areDeeplyEqual and hasCycle', () => {
  void it('compares primitives and each supported runtime value structurally', () => {
    assert.equal(Predicates.areDeeplyEqual(Number.NaN, Number.NaN), true);
    assert.equal(Predicates.areDeeplyEqual(-0, 0), false);
    assert.equal(Predicates.areDeeplyEqual(new Date(1), new Date(1)), true);
    assert.equal(
      Predicates.areDeeplyEqual(
        TypesFixtures.freshPattern(PATTERN_FIXTURES.valueCaseInsensitive),
        TypesFixtures.freshPattern(PATTERN_FIXTURES.valueCaseInsensitive)
      ),
      true
    );
    assert.equal(
      Predicates.areDeeplyEqual(PATTERN_FIXTURES.valueGlobal, PATTERN_FIXTURES.other),
      false
    );
    assert.equal(
      Predicates.areDeeplyEqual(
        new Map<unknown, unknown>([[{ 'id': 1 }, new Set<unknown>([{ 'value': [1, 2] }])]]),
        new Map<unknown, unknown>([[{ 'id': 1 }, new Set<unknown>([{ 'value': [1, 2] }])]])
      ),
      true
    );
  });

  void it('compares cyclic Maps and Sets without losing graph topology', () => {
    const leftMap = new Map<unknown, unknown>();
    leftMap.set('self', leftMap);
    const rightMap = new Map<unknown, unknown>();
    rightMap.set('self', rightMap);
    assert.equal(Predicates.areDeeplyEqual(leftMap, rightMap), true);

    const leftSet = new Set<unknown>();
    leftSet.add(leftSet);
    const rightSet = new Set<unknown>();
    rightSet.add(rightSet);
    assert.equal(Predicates.areDeeplyEqual(leftSet, rightSet), true);

    const twoNodeCycle: Record<string, unknown> = {};
    const secondNode: Record<string, unknown> = { 'next': twoNodeCycle };
    twoNodeCycle.next = secondNode;
    const selfCycle: Record<string, unknown> = {};
    selfCycle.next = selfCycle;
    assert.equal(Predicates.areDeeplyEqual(selfCycle, twoNodeCycle), false);
  });

  void it('detects cycles through Map keys, Map values, and Set members', () => {
    const mapKeyCycle = new Map<unknown, unknown>();
    mapKeyCycle.set(mapKeyCycle, 1);
    assert.equal(Predicates.hasCycle(mapKeyCycle), true);

    const mapValueCycle = new Map<unknown, unknown>();
    mapValueCycle.set('self', mapValueCycle);
    assert.equal(Predicates.hasCycle(mapValueCycle), true);

    const setCycle = new Set<unknown>();
    setCycle.add(setCycle);
    assert.equal(Predicates.hasCycle(setCycle), true);

    const shared = { 'value': 1 };
    assert.equal(Predicates.hasCycle({ 'first': shared, 'second': shared }), false);
  });

  void it('detects cycles through Date and RegExp enumerable properties', () => {
    const date = new Date();
    Object.assign(date, { 'self': date });
    assert.equal(Predicates.hasCycle(date), true);

    const expression = TypesFixtures.freshPattern(PATTERN_FIXTURES.cycle);
    Object.assign(expression, { 'self': expression });
    assert.equal(Predicates.hasCycle(expression), true);
  });
});

void describe('Predicates.isInstanceOf', () => {
  class Base {
    public kind(): string {
      return 'base';
    }
  }

  class Derived extends Base {}

  class ProtectedConstructed {
    public readonly label: string;

    protected constructor(label: string) {
      this.label = label;
    }

    public static create(label: string): ProtectedConstructed {
      return new ProtectedConstructed(label);
    }
  }

  class Unrelated {}

  class ThrowingInstanceCheck {
    public static [Symbol.hasInstance](): boolean {
      throw new TypesFixtureError('Instance check failed.');
    }
  }

  void it('narrows a subtype instance to the constructor instance type', () => {
    const candidate: unknown = new Derived();

    if (Predicates.isInstanceOf(candidate, Base)) {
      const base: Base = candidate;
      assert.equal(base.kind(), 'base');
      assert.equal(candidate instanceof Derived, true);
      return;
    }

    assert.fail('Expected a Base instance.');
  });

  void it('narrows an instance from a protected-constructor static factory', () => {
    const candidate: unknown = ProtectedConstructed.create('factory');

    if (Predicates.isInstanceOf(candidate, ProtectedConstructed)) {
      const protectedConstructed: ProtectedConstructed = candidate;
      assert.equal(protectedConstructed.label, 'factory');
      return;
    }

    assert.fail('Expected a ProtectedConstructed instance.');
  });

  void it('returns false for an unrelated instance', () => {
    assert.equal(Predicates.isInstanceOf(new Unrelated(), Derived), false);
  });

  void it('returns false when the instance check throws', () => {
    assert.equal(Predicates.isInstanceOf(new Base(), ThrowingInstanceCheck), false);
  });
});
