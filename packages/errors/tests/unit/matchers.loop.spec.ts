import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorClassifier, matchers } from '../../src/index.js';
import scenarioGroups from './matchers.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: {
        frozen: boolean;
        hasClassifierConstants: boolean;
        hasInstanceIsType: boolean;
        numberMatch: boolean;
        stringMatch: boolean;
      };
      input: {
        numberValue: string;
        stringValue: string;
      };
      shape: 'immutable-matcher-route';
      name: string;
    }
  | {
      description: string;
      expected: {
        and: boolean;
        contains: boolean;
        containsAll: boolean;
        containsAny: boolean;
        containsIgnoreCase: boolean;
        endsWith: boolean;
        hasAllProperties: boolean;
        hasAnyProperty: boolean;
        hasMethod: boolean;
        hasProperty: boolean;
        isAsyncIterable: boolean;
        isCallable: boolean;
        isError: boolean;
        isFalse: boolean;
        isIterable: boolean;
        isTrue: boolean;
        lessThan: boolean;
        lengthInRange: boolean;
        lte: boolean;
        matches: boolean;
        named: boolean;
        namedAny: boolean;
        not: boolean;
        notEmpty: boolean;
        oneOf: boolean;
        of: boolean;
        ofAny: boolean;
        or: boolean;
        startsWith: boolean;
        startsWithIgnoreCase: boolean;
      };
      input: {
        code: string;
        errorName: string;
        numberValue: number;
        objectValue: Record<string, unknown>;
        stringValue: string;
      };
      shape: 'negative-matcher-route';
      name: string;
    }
  | {
      description: string;
      expected: Record<string, boolean>;
      input: Record<string, unknown>;
      shape: 'array-matchers' | 'boolean-matchers' | 'database-matchers' | 'empty-variadics' | 'http-matchers' | 'instance-matchers' | 'logic-matchers' | 'network-matchers' | 'number-matchers' | 'object-matchers' | 'proto-matchers' | 'string-matchers';
      name: string;
    };

type ScenarioRunner = (scenario: ScenarioCase) => void;

function assertMatcherSurface(): void {
  assert.strictEqual(Object.isFrozen(matchers), true);
  assert.strictEqual(Object.isFrozen(matchers.number), true);
  assert.strictEqual(Object.isFrozen(matchers.http), true);
  assert.strictEqual(Object.hasOwn(ErrorClassifier, 'NUMBER_MATCHERS'), false);
  assert.strictEqual(Object.hasOwn(ErrorClassifier, 'HTTP_MATCHERS'), false);
  assert.strictEqual(Object.hasOwn(matchers.instance, 'isType'), false);
}

const runnerMap = {
  'array-matchers': (scenario) => {
    const value = scenario.input.arrayValue as string[];
    assert.strictEqual(matchers.array.contains('b')(value), scenario.expected.contains);
    assert.strictEqual(matchers.array.containsAll('a', 'b')(value), scenario.expected.containsAll);
    assert.strictEqual(matchers.array.containsAny('z', 'b')(value), scenario.expected.containsAny);
    assert.strictEqual(matchers.array.lengthInRange(2, 4)(value), scenario.expected.lengthInRange);
    assert.strictEqual(matchers.array.notEmpty(value), scenario.expected.notEmpty);
  },
  'boolean-matchers': (scenario) => {
    const value = Boolean(scenario.input.booleanValue);
    assert.strictEqual(matchers.boolean.isFalse(false), scenario.expected.isFalse);
    assert.strictEqual(matchers.boolean.isTrue(value), scenario.expected.isTrue);
  },
  'database-matchers': (scenario) => {
    assert.strictEqual(matchers.database.isConnectionError(String(scenario.input.connectionCode)), scenario.expected.connectionError);
    assert.strictEqual(matchers.database.isConstraintViolation(String(scenario.input.constraintCode)), scenario.expected.constraintViolation);
    assert.strictEqual(matchers.database.isDeadlock(String(scenario.input.deadlockCode)), scenario.expected.deadlock);
    assert.strictEqual(matchers.database.isForeignKeyViolation(String(scenario.input.foreignKeyCode)), scenario.expected.foreignKey);
    assert.strictEqual(matchers.database.isUniqueViolation(String(scenario.input.code)), scenario.expected.uniqueViolation);
  },
  'empty-variadics': (scenario) => {
    const emptyObject = {};
    const emptyArray: unknown[] = [];

    assert.strictEqual(matchers.logic.and<number>()(Number(scenario.input.numberValue)), scenario.expected.and);
    assert.strictEqual(matchers.logic.or<number>()(Number(scenario.input.numberValue)), scenario.expected.or);
    assert.strictEqual(matchers.array.containsAll<string>()(emptyArray as string[]), scenario.expected.containsAll);
    assert.strictEqual(matchers.array.containsAny<string>()(emptyArray as string[]), scenario.expected.containsAny);
    assert.strictEqual(matchers.object.hasAllProperties()(emptyObject), scenario.expected.hasAllProperties);
    assert.strictEqual(matchers.object.hasAnyProperty()(emptyObject), scenario.expected.hasAnyProperty);
  },
  'http-matchers': (scenario) => {
    const status = Number(scenario.input.status);
    assert.strictEqual(matchers.http.isAuthError(status), scenario.expected.isAuthError);
    assert.strictEqual(matchers.http.isClientError(status), scenario.expected.isClientError);
    assert.strictEqual(matchers.http.isGatewayError(status), scenario.expected.isGatewayError);
    assert.strictEqual(matchers.http.isInformational(status), scenario.expected.isInformational);
    assert.strictEqual(matchers.http.isRateLimited(status), scenario.expected.isRateLimited);
    assert.strictEqual(matchers.http.isRedirection(status), scenario.expected.isRedirection);
    assert.strictEqual(matchers.http.isRetryable(status), scenario.expected.isRetryable);
    assert.strictEqual(matchers.http.isServerError(status), scenario.expected.isServerError);
    assert.strictEqual(matchers.http.isSuccess(status), scenario.expected.isSuccess);
  },
  'immutable-matcher-route': (scenario) => {
    assert.strictEqual(Object.isFrozen(matchers), scenario.expected.frozen);
    assert.strictEqual(
      Object.hasOwn(ErrorClassifier, 'NUMBER_MATCHERS') || Object.hasOwn(ErrorClassifier, 'HTTP_MATCHERS'),
      scenario.expected.hasClassifierConstants
    );
    assert.strictEqual(Object.hasOwn(matchers.instance, 'isType'), scenario.expected.hasInstanceIsType);
    assert.strictEqual(matchers.isType<string>('string')(scenario.input.stringValue), scenario.expected.stringMatch);
    assert.strictEqual(matchers.isType<number>('number')(scenario.input.numberValue), scenario.expected.numberMatch);
  },
  'instance-matchers': (scenario) => {
    const error = new TypeError('boom');
    assert.strictEqual(matchers.instance.isError(error), scenario.expected.isError);
    assert.strictEqual(matchers.instance.named(String(scenario.input.errorName))(error), scenario.expected.named);
    assert.strictEqual(matchers.instance.namedAny('RangeError', 'TypeError')(error), scenario.expected.namedAny);
    assert.strictEqual(matchers.instance.of(TypeError)(error), scenario.expected.of);
    assert.strictEqual(matchers.instance.ofAny(RangeError, TypeError)(error), scenario.expected.ofAny);
  },
  'logic-matchers': (scenario) => {
    const value = Number(scenario.input.numberValue);
    const greater = matchers.number.gte(500);
    const less = matchers.number.lessThan(600);
    const equal = matchers.number.oneOf(503);
    assert.strictEqual(matchers.logic.and(greater, less)(value), scenario.expected.and);
    assert.strictEqual(matchers.logic.not(matchers.number.inRange(200, 299))(value), scenario.expected.not);
    assert.strictEqual(matchers.logic.or(equal, matchers.number.oneOf(429))(value), scenario.expected.or);
  },
  'negative-matcher-route': (scenario) => {
    const value = scenario.input.numberValue;
    const stringValue = scenario.input.stringValue;
    const objectValue = scenario.input.objectValue;
    const error = {} as Error;
    const iterable = {
      [Symbol.iterator](): Iterator<number> {
        return [1, 2][Symbol.iterator]();
      }
    };

    assert.strictEqual(matchers.number.greaterThan(4)(value), false);
    assert.strictEqual(matchers.number.gte(5)(value), false);
    assert.strictEqual(matchers.number.inRange(4, 5)(value), false);
    assert.strictEqual(matchers.number.lessThan(6)(value), true);
    assert.strictEqual(matchers.number.lte(5)(value), true);
    assert.strictEqual(matchers.number.oneOf(1, 5, 9)(value), false);

    assert.strictEqual(matchers.string.contains('Connection')(stringValue), false);
    assert.strictEqual(matchers.string.containsIgnoreCase('connection refused')(stringValue), false);
    assert.strictEqual(matchers.string.endsWith('Refused')(stringValue), false);
    assert.strictEqual(matchers.string.lengthInRange(10, 30)(stringValue), false);
    assert.strictEqual(matchers.string.matches(/Refused$/u)(stringValue), false);
    assert.strictEqual(matchers.string.notEmpty(stringValue), false);
    assert.strictEqual(matchers.string.oneOf('Connection Refused', 'other')(stringValue), false);
    assert.strictEqual(matchers.string.startsWith('Connection')(stringValue), false);
    assert.strictEqual(matchers.string.startsWithIgnoreCase('connection')(stringValue), false);

    assert.strictEqual(matchers.boolean.isFalse(true), false);
    assert.strictEqual(matchers.boolean.isTrue(false), false);

    assert.strictEqual(matchers.array.contains('b')(['x', 'y']), false);
    assert.strictEqual(matchers.array.containsAll('a', 'b')(['a', 'x']), false);
    assert.strictEqual(matchers.array.containsAny('z', 'b')(['a', 'x']), false);
    assert.strictEqual(matchers.array.lengthInRange(2, 4)(['a']), false);
    assert.strictEqual(matchers.array.notEmpty([]), false);

    assert.strictEqual(matchers.object.hasAllProperties('alpha', 'beta')(objectValue), false);
    assert.strictEqual(matchers.object.hasAnyProperty('gamma', 'beta')(objectValue), false);
    assert.strictEqual(matchers.object.hasProperty('alpha')(objectValue), false);

    assert.strictEqual(matchers.logic.and<number>(matchers.number.gte(500), matchers.number.lessThan(600))(value), false);
    assert.strictEqual(matchers.logic.not<number>(matchers.number.inRange(200, 299))(value), true);
    assert.strictEqual(matchers.logic.or<number>(matchers.number.oneOf(503), matchers.number.oneOf(429))(value), false);

    assert.strictEqual(matchers.network.isConnectionError(String(scenario.input.code)), false);
    assert.strictEqual(matchers.network.isDNSError(String(scenario.input.code)), false);
    assert.strictEqual(matchers.network.isTimeout(String(scenario.input.code)), false);

    assert.strictEqual(matchers.database.isConnectionError('00000'), false);
    assert.strictEqual(matchers.database.isConstraintViolation('00000'), false);
    assert.strictEqual(matchers.database.isDeadlock('00000'), false);
    assert.strictEqual(matchers.database.isForeignKeyViolation('00000'), false);
    assert.strictEqual(matchers.database.isUniqueViolation('00000'), false);

    assert.strictEqual(matchers.instance.isError(error), false);
    assert.strictEqual(matchers.instance.named('RangeError')(error), false);
    assert.strictEqual(matchers.instance.namedAny('RangeError', 'SyntaxError')(error), false);
    assert.strictEqual(matchers.instance.of(RangeError)(error), false);
    assert.strictEqual(matchers.instance.ofAny(RangeError, SyntaxError)(error), false);

    assert.strictEqual(matchers.proto.hasAllMethods('read', 'write')(iterable), false);
    assert.strictEqual(matchers.proto.hasAnyMethod('read', 'missing')(iterable), false);
    assert.strictEqual(matchers.proto.hasMethod('pipe')(iterable), false);
    assert.strictEqual(matchers.proto.hasProperty('read')(iterable), false);
    assert.strictEqual(matchers.proto.isAsyncIterable(iterable), false);
    assert.strictEqual(matchers.proto.isCallable(stringValue as never), false);
    assert.strictEqual(matchers.proto.isIterable(objectValue as never), false);
  },
  'network-matchers': (scenario) => {
    const value = String(scenario.input.code);
    assert.strictEqual(matchers.network.isConnectionError(value), scenario.expected.connectionError);
    assert.strictEqual(matchers.network.isDNSError(value), scenario.expected.dnsError);
    assert.strictEqual(matchers.network.isTimeout(value), scenario.expected.timeout);
  },
  'number-matchers': (scenario) => {
    const value = Number(scenario.input.numberValue);
    assert.strictEqual(matchers.number.greaterThan(4)(value), scenario.expected.greaterThan);
    assert.strictEqual(matchers.number.gte(5)(value), scenario.expected.gte);
    assert.strictEqual(matchers.number.inRange(4, 5)(value), scenario.expected.inRange);
    assert.strictEqual(matchers.number.lessThan(6)(value), scenario.expected.lessThan);
    assert.strictEqual(matchers.number.lte(5)(value), scenario.expected.lte);
    assert.strictEqual(matchers.number.oneOf(1, 5, 9)(value), scenario.expected.oneOf);
  },
  'object-matchers': (scenario) => {
    const value = scenario.input.objectValue as Record<string, unknown>;
    assert.strictEqual(matchers.object.hasAllProperties('alpha', 'beta')(value), scenario.expected.hasAllProperties);
    assert.strictEqual(matchers.object.hasAnyProperty('gamma', 'beta')(value), scenario.expected.hasAnyProperty);
    assert.strictEqual(matchers.object.hasProperty('alpha')(value), scenario.expected.hasProperty);
  },
  'proto-matchers': (scenario) => {
    const asyncIterable = {
      [Symbol.asyncIterator](): AsyncIterator<number> {
        return {
          async next() { return { done: true, value: undefined }; }
        };
      }
    };
    const iterable = {
      [Symbol.iterator](): Iterator<number> {
        return [1, 2][Symbol.iterator]();
      },
      pipe() { return true; },
      read() { return true; },
      write() { return true; }
    };
    const callable = () => true;
    assert.strictEqual(matchers.proto.hasAllMethods('read', 'write')(iterable), scenario.expected.hasAllMethods);
    assert.strictEqual(matchers.proto.hasAnyMethod('read', 'missing')(iterable), scenario.expected.hasAnyMethod);
    assert.strictEqual(matchers.proto.hasMethod('pipe')(iterable), scenario.expected.hasMethod);
    assert.strictEqual(matchers.proto.hasProperty('read')(iterable), scenario.expected.hasProperty);
    assert.strictEqual(matchers.proto.isAsyncIterable(asyncIterable), scenario.expected.isAsyncIterable);
    assert.strictEqual(matchers.proto.isCallable(callable), scenario.expected.isCallable);
    assert.strictEqual(matchers.proto.isIterable(iterable), scenario.expected.isIterable);
  },
  'string-matchers': (scenario) => {
    const value = String(scenario.input.stringValue);
    assert.strictEqual(matchers.string.contains('Connection')(value), scenario.expected.contains);
    assert.strictEqual(matchers.string.containsIgnoreCase('connection refused')(value), scenario.expected.containsIgnoreCase);
    assert.strictEqual(matchers.string.endsWith('Refused')(value), scenario.expected.endsWith);
    assert.strictEqual(matchers.string.lengthInRange(10, 30)(value), scenario.expected.lengthInRange);
    assert.strictEqual(matchers.string.matches(/Refused$/u)(value), scenario.expected.matches);
    assert.strictEqual(matchers.string.notEmpty(value), scenario.expected.notEmpty);
    assert.strictEqual(matchers.string.oneOf('Connection Refused', 'other')(value), scenario.expected.oneOf);
    assert.strictEqual(matchers.string.startsWith('Connection')(value), scenario.expected.startsWith);
    assert.strictEqual(matchers.string.startsWithIgnoreCase('connection')(value), scenario.expected.startsWithIgnoreCase);
  }
} satisfies Record<ScenarioCase['shape'], ScenarioRunner>;

function runCase(scenario: ScenarioCase): void {
  assertMatcherSurface();
  runnerMap[scenario.shape](scenario);
}

void describe('matchers', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
