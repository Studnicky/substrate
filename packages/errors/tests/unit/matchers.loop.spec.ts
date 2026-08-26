import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorClassifier, matchers } from '../../src/index.js';
import scenarioGroups from './matchers.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: {
        frozen: boolean;
        hasClassifierConstants: boolean;
      };
      input: Record<string, never>;
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
        isFalse: boolean;
        isTrue: boolean;
        lessThan: boolean;
        lengthInRange: boolean;
        lte: boolean;
        matches: boolean;
        not: boolean;
        notEmpty: boolean;
        oneOf: boolean;
        or: boolean;
        startsWith: boolean;
        startsWithIgnoreCase: boolean;
      };
      input: {
        code: string;
        errorName: string;
        numberValue: number;
        stringValue: string;
      };
      shape: 'negative-matcher-route';
      name: string;
    }
  | { description: string; expected: Record<string, boolean>; input: Record<string, unknown>; shape: 'array-matchers'; name: string }
  | { description: string; expected: Record<string, boolean>; input: Record<string, unknown>; shape: 'boolean-matchers'; name: string }
  | { description: string; expected: Record<string, boolean>; input: Record<string, unknown>; shape: 'database-matchers'; name: string }
  | { description: string; expected: Record<string, boolean>; input: Record<string, unknown>; shape: 'empty-variadics'; name: string }
  | { description: string; expected: Record<string, boolean>; input: Record<string, unknown>; shape: 'http-matchers'; name: string }
  | { description: string; expected: Record<string, boolean>; input: Record<string, unknown>; shape: 'logic-matchers'; name: string }
  | { description: string; expected: Record<string, boolean>; input: Record<string, unknown>; shape: 'network-matchers'; name: string }
  | { description: string; expected: Record<string, boolean>; input: Record<string, unknown>; shape: 'number-matchers'; name: string }
  | { description: string; expected: Record<string, boolean>; input: Record<string, unknown>; shape: 'string-matchers'; name: string };

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenario: Extract<ScenarioCase, { shape: K }>) => void;

type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

function assertMatcherSurface(): void {
  assert.strictEqual(Object.isFrozen(matchers), true);
  assert.strictEqual(Object.isFrozen(matchers.number), true);
  assert.strictEqual(Object.isFrozen(matchers.http), true);
  assert.strictEqual(Object.hasOwn(ErrorClassifier, 'NUMBER_MATCHERS'), false);
  assert.strictEqual(Object.hasOwn(ErrorClassifier, 'HTTP_MATCHERS'), false);
  assert.strictEqual(Object.hasOwn(matchers, 'instance'), false);
  assert.strictEqual(Object.hasOwn(matchers, 'isType'), false);
  assert.strictEqual(Object.hasOwn(matchers, 'object'), false);
  assert.strictEqual(Object.hasOwn(matchers, 'proto'), false);
}

const runnerMap: RunnerMap = {
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
    const emptyArray: string[] = [];

    assert.strictEqual(matchers.logic.and<number>()(Number(scenario.input.numberValue)), scenario.expected.and);
    assert.strictEqual(matchers.logic.or<number>()(Number(scenario.input.numberValue)), scenario.expected.or);
    assert.strictEqual(matchers.array.containsAll<string>()(emptyArray), scenario.expected.containsAll);
    assert.strictEqual(matchers.array.containsAny<string>()(emptyArray), scenario.expected.containsAny);
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

    assert.strictEqual(matchers.number.greaterThan(4)(value), false);
    assert.strictEqual(matchers.number.gte(5)(value), false);
    assert.strictEqual(matchers.number.inRange(4, 5)(value), false);
    assert.strictEqual(matchers.number.lessThan(6)(value), scenario.expected.lessThan);
    assert.strictEqual(matchers.number.lte(5)(value), scenario.expected.lte);
    assert.strictEqual(matchers.number.oneOf(1, 5, 9)(value), scenario.expected.oneOf);

    assert.strictEqual(matchers.string.contains('Connection')(stringValue), scenario.expected.contains);
    assert.strictEqual(matchers.string.containsIgnoreCase('connection refused')(stringValue), scenario.expected.containsIgnoreCase);
    assert.strictEqual(matchers.string.endsWith('Refused')(stringValue), scenario.expected.endsWith);
    assert.strictEqual(matchers.string.lengthInRange(10, 30)(stringValue), scenario.expected.lengthInRange);
    assert.strictEqual(matchers.string.matches(/Refused$/u)(stringValue), scenario.expected.matches);
    assert.strictEqual(matchers.string.notEmpty(stringValue), scenario.expected.notEmpty);
    assert.strictEqual(matchers.string.oneOf('Connection Refused', 'other')(stringValue), scenario.expected.oneOf);
    assert.strictEqual(matchers.string.startsWith('Connection')(stringValue), scenario.expected.startsWith);
    assert.strictEqual(matchers.string.startsWithIgnoreCase('connection')(stringValue), scenario.expected.startsWithIgnoreCase);

    assert.strictEqual(matchers.boolean.isFalse(true), scenario.expected.isFalse);
    assert.strictEqual(matchers.boolean.isTrue(false), scenario.expected.isTrue);

    assert.strictEqual(matchers.array.contains('b')(['x', 'y']), scenario.expected.contains);
    assert.strictEqual(matchers.array.containsAll('a', 'b')(['a', 'x']), scenario.expected.containsAll);
    assert.strictEqual(matchers.array.containsAny('z', 'b')(['a', 'x']), scenario.expected.containsAny);
    assert.strictEqual(matchers.array.lengthInRange(2, 4)(['a']), scenario.expected.lengthInRange);
    assert.strictEqual(matchers.array.notEmpty([]), scenario.expected.notEmpty);

    assert.strictEqual(matchers.logic.and<number>(matchers.number.gte(500), matchers.number.lessThan(600))(value), scenario.expected.and);
    assert.strictEqual(matchers.logic.not<number>(matchers.number.inRange(200, 299))(value), scenario.expected.not);
    assert.strictEqual(matchers.logic.or<number>(matchers.number.oneOf(503), matchers.number.oneOf(429))(value), scenario.expected.or);

    assert.strictEqual(matchers.network.isConnectionError(String(scenario.input.code)), false);
    assert.strictEqual(matchers.network.isDNSError(String(scenario.input.code)), false);
    assert.strictEqual(matchers.network.isTimeout(String(scenario.input.code)), false);

    assert.strictEqual(matchers.database.isConnectionError('00000'), false);
    assert.strictEqual(matchers.database.isConstraintViolation('00000'), false);
    assert.strictEqual(matchers.database.isDeadlock('00000'), false);
    assert.strictEqual(matchers.database.isForeignKeyViolation('00000'), false);
    assert.strictEqual(matchers.database.isUniqueViolation('00000'), false);

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
};

function runCase<K extends ScenarioCase['shape']>(scenario: Extract<ScenarioCase, { shape: K }>): void {
  assertMatcherSurface();
  runnerMap[scenario.shape](scenario);
}

function isScenarioCase(scenario: { shape: string }): scenario is ScenarioCase {
  return Object.hasOwn(runnerMap, scenario.shape);
}

void describe('matchers', () => {
  for (const scenario of scenarioGroups.cases as { name: string; shape: string }[]) {
    if (!isScenarioCase(scenario)) { continue; }
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
