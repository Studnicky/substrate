import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { ErrorClassifier, matchers } from '../../src/index.js';
import { REFUSED_SUFFIX_PATTERN } from '../fixtures/REFUSED_SUFFIX_PATTERN.js';
import { MatchersScenarioCaseEntity } from './entities/MatchersScenarioCaseEntity.js';
import scenarioGroups from './matchers.scenarios.json' with { 'type': 'json' };

class MatchersRunners {
  static 'array-matchers'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'array-matchers'>): void {
    MatchersRunners.assertMatcherSurface();
    const value = [...ScenarioValues.requireStringArray(scenarioCase.input.arrayValue, 'Scenario input.arrayValue')];
    assert.strictEqual(matchers.array.contains('b')(value), scenarioCase.expected.contains);
    assert.strictEqual(matchers.array.containsAll('a', 'b')(value), scenarioCase.expected.containsAll);
    assert.strictEqual(matchers.array.containsAny('z', 'b')(value), scenarioCase.expected.containsAny);
    assert.strictEqual(matchers.array.lengthInRange(2, 4)(value), scenarioCase.expected.lengthInRange);
    assert.strictEqual(matchers.array.notEmpty(value), scenarioCase.expected.notEmpty);
  }

  static 'boolean-matchers'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'boolean-matchers'>): void {
    MatchersRunners.assertMatcherSurface();
    const value = Boolean(scenarioCase.input.booleanValue);
    assert.strictEqual(matchers.boolean.isFalse(false), scenarioCase.expected.isFalse);
    assert.strictEqual(matchers.boolean.isTrue(value), scenarioCase.expected.isTrue);
  }

  static 'database-matchers'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'database-matchers'>): void {
    MatchersRunners.assertMatcherSurface();
    assert.strictEqual(matchers.database.isConnectionError(String(scenarioCase.input.connectionCode)), scenarioCase.expected.connectionError);
    assert.strictEqual(matchers.database.isConstraintViolation(String(scenarioCase.input.constraintCode)), scenarioCase.expected.constraintViolation);
    assert.strictEqual(matchers.database.isDeadlock(String(scenarioCase.input.deadlockCode)), scenarioCase.expected.deadlock);
    assert.strictEqual(matchers.database.isForeignKeyViolation(String(scenarioCase.input.foreignKeyCode)), scenarioCase.expected.foreignKey);
    assert.strictEqual(matchers.database.isUniqueViolation(String(scenarioCase.input.code)), scenarioCase.expected.uniqueViolation);
  }

  static 'empty-variadics'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'empty-variadics'>): void {
    MatchersRunners.assertMatcherSurface();
    const emptyArray: string[] = [];

    assert.strictEqual(matchers.logic.and<number>()(Number(scenarioCase.input.numberValue)), scenarioCase.expected.and);
    assert.strictEqual(matchers.logic.or<number>()(Number(scenarioCase.input.numberValue)), scenarioCase.expected.or);
    assert.strictEqual(matchers.array.containsAll<string>()(emptyArray), scenarioCase.expected.containsAll);
    assert.strictEqual(matchers.array.containsAny<string>()(emptyArray), scenarioCase.expected.containsAny);
  }

  static 'http-matchers'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'http-matchers'>): void {
    MatchersRunners.assertMatcherSurface();
    const status = Number(scenarioCase.input.status);
    assert.strictEqual(matchers.http.isAuthError(status), scenarioCase.expected.isAuthError);
    assert.strictEqual(matchers.http.isClientError(status), scenarioCase.expected.isClientError);
    assert.strictEqual(matchers.http.isGatewayError(status), scenarioCase.expected.isGatewayError);
    assert.strictEqual(matchers.http.isInformational(status), scenarioCase.expected.isInformational);
    assert.strictEqual(matchers.http.isRateLimited(status), scenarioCase.expected.isRateLimited);
    assert.strictEqual(matchers.http.isRedirection(status), scenarioCase.expected.isRedirection);
    assert.strictEqual(matchers.http.isRetryable(status), scenarioCase.expected.isRetryable);
    assert.strictEqual(matchers.http.isServerError(status), scenarioCase.expected.isServerError);
    assert.strictEqual(matchers.http.isSuccess(status), scenarioCase.expected.isSuccess);
  }

  static 'immutable-matcher-route'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'immutable-matcher-route'>): void {
    MatchersRunners.assertMatcherSurface();
    assert.strictEqual(Object.isFrozen(matchers), scenarioCase.expected.frozen);
    assert.strictEqual(
      Object.hasOwn(ErrorClassifier, 'NUMBER_MATCHERS') || Object.hasOwn(ErrorClassifier, 'HTTP_MATCHERS'),
      scenarioCase.expected.hasClassifierConstants
    );
  }

  static 'logic-matchers'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'logic-matchers'>): void {
    MatchersRunners.assertMatcherSurface();
    const value = Number(scenarioCase.input.numberValue);
    const greater = matchers.number.gte(500);
    const less = matchers.number.lessThan(600);
    const equal = matchers.number.oneOf(503);
    assert.strictEqual(matchers.logic.and(greater, less)(value), scenarioCase.expected.and);
    assert.strictEqual(matchers.logic.not(matchers.number.inRange(200, 299))(value), scenarioCase.expected.not);
    assert.strictEqual(matchers.logic.or(equal, matchers.number.oneOf(429))(value), scenarioCase.expected.or);
  }

  static 'negative-matcher-route'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'negative-matcher-route'>): void {
    MatchersRunners.assertMatcherSurface();
    const value = Number(scenarioCase.input.numberValue);
    const stringValue = String(scenarioCase.input.stringValue);

    assert.strictEqual(matchers.number.greaterThan(4)(value), false);
    assert.strictEqual(matchers.number.gte(5)(value), false);
    assert.strictEqual(matchers.number.inRange(4, 5)(value), false);
    assert.strictEqual(matchers.number.lessThan(6)(value), scenarioCase.expected.lessThan);
    assert.strictEqual(matchers.number.lte(5)(value), scenarioCase.expected.lte);
    assert.strictEqual(matchers.number.oneOf(1, 5, 9)(value), scenarioCase.expected.oneOf);

    assert.strictEqual(matchers.string.contains('Connection')(stringValue), scenarioCase.expected.contains);
    assert.strictEqual(matchers.string.containsIgnoreCase('connection refused')(stringValue), scenarioCase.expected.containsIgnoreCase);
    assert.strictEqual(matchers.string.endsWith('Refused')(stringValue), scenarioCase.expected.endsWith);
    assert.strictEqual(matchers.string.lengthInRange(10, 30)(stringValue), scenarioCase.expected.lengthInRange);
    assert.strictEqual(matchers.string.matches(REFUSED_SUFFIX_PATTERN)(stringValue), scenarioCase.expected.matches);
    assert.strictEqual(matchers.string.notEmpty(stringValue), scenarioCase.expected.notEmpty);
    assert.strictEqual(matchers.string.oneOf('Connection Refused', 'other')(stringValue), scenarioCase.expected.oneOf);
    assert.strictEqual(matchers.string.startsWith('Connection')(stringValue), scenarioCase.expected.startsWith);
    assert.strictEqual(matchers.string.startsWithIgnoreCase('connection')(stringValue), scenarioCase.expected.startsWithIgnoreCase);

    assert.strictEqual(matchers.boolean.isFalse(true), scenarioCase.expected.isFalse);
    assert.strictEqual(matchers.boolean.isTrue(false), scenarioCase.expected.isTrue);

    assert.strictEqual(matchers.array.contains('b')(['x', 'y']), scenarioCase.expected.contains);
    assert.strictEqual(matchers.array.containsAll('a', 'b')(['a', 'x']), scenarioCase.expected.containsAll);
    assert.strictEqual(matchers.array.containsAny('z', 'b')(['a', 'x']), scenarioCase.expected.containsAny);
    assert.strictEqual(matchers.array.lengthInRange(2, 4)(['a']), scenarioCase.expected.lengthInRange);
    assert.strictEqual(matchers.array.notEmpty([]), scenarioCase.expected.notEmpty);

    assert.strictEqual(matchers.logic.and<number>(matchers.number.gte(500), matchers.number.lessThan(600))(value), scenarioCase.expected.and);
    assert.strictEqual(matchers.logic.not<number>(matchers.number.inRange(200, 299))(value), scenarioCase.expected.not);
    assert.strictEqual(matchers.logic.or<number>(matchers.number.oneOf(503), matchers.number.oneOf(429))(value), scenarioCase.expected.or);

    assert.strictEqual(matchers.network.isConnectionError(String(scenarioCase.input.code)), false);
    assert.strictEqual(matchers.network.isDNSError(String(scenarioCase.input.code)), false);
    assert.strictEqual(matchers.network.isTimeout(String(scenarioCase.input.code)), false);

    assert.strictEqual(matchers.database.isConnectionError('00000'), false);
    assert.strictEqual(matchers.database.isConstraintViolation('00000'), false);
    assert.strictEqual(matchers.database.isDeadlock('00000'), false);
    assert.strictEqual(matchers.database.isForeignKeyViolation('00000'), false);
    assert.strictEqual(matchers.database.isUniqueViolation('00000'), false);
  }

  static 'network-matchers'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'network-matchers'>): void {
    MatchersRunners.assertMatcherSurface();
    const value = String(scenarioCase.input.code);
    assert.strictEqual(matchers.network.isConnectionError(value), scenarioCase.expected.connectionError);
    assert.strictEqual(matchers.network.isDNSError(value), scenarioCase.expected.dnsError);
    assert.strictEqual(matchers.network.isTimeout(value), scenarioCase.expected.timeout);
  }

  static 'number-matchers'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'number-matchers'>): void {
    MatchersRunners.assertMatcherSurface();
    const value = Number(scenarioCase.input.numberValue);
    assert.strictEqual(matchers.number.greaterThan(4)(value), scenarioCase.expected.greaterThan);
    assert.strictEqual(matchers.number.gte(5)(value), scenarioCase.expected.gte);
    assert.strictEqual(matchers.number.inRange(4, 5)(value), scenarioCase.expected.inRange);
    assert.strictEqual(matchers.number.lessThan(6)(value), scenarioCase.expected.lessThan);
    assert.strictEqual(matchers.number.lte(5)(value), scenarioCase.expected.lte);
    assert.strictEqual(matchers.number.oneOf(1, 5, 9)(value), scenarioCase.expected.oneOf);
  }

  static 'string-matchers'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'string-matchers'>): void {
    MatchersRunners.assertMatcherSurface();
    const value = String(scenarioCase.input.stringValue);
    assert.strictEqual(matchers.string.contains('Connection')(value), scenarioCase.expected.contains);
    assert.strictEqual(matchers.string.containsIgnoreCase('connection refused')(value), scenarioCase.expected.containsIgnoreCase);
    assert.strictEqual(matchers.string.endsWith('Refused')(value), scenarioCase.expected.endsWith);
    assert.strictEqual(matchers.string.lengthInRange(10, 30)(value), scenarioCase.expected.lengthInRange);
    assert.strictEqual(matchers.string.matches(REFUSED_SUFFIX_PATTERN)(value), scenarioCase.expected.matches);
    assert.strictEqual(matchers.string.notEmpty(value), scenarioCase.expected.notEmpty);
    assert.strictEqual(matchers.string.oneOf('Connection Refused', 'other')(value), scenarioCase.expected.oneOf);
    assert.strictEqual(matchers.string.startsWith('Connection')(value), scenarioCase.expected.startsWith);
    assert.strictEqual(matchers.string.startsWithIgnoreCase('connection')(value), scenarioCase.expected.startsWithIgnoreCase);
  }

  private static assertMatcherSurface(): void {
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
}

ScenarioSuite.register({
  'entity': MatchersScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'matchers',
  'runners': MatchersRunners
});
