import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { GroupValueDiscriminantEntity, MatchContextInterface, MatcherHandlerInterface, MatcherUnionType, PartitionGroupInterface } from '../../src/index.js';

import { matcherRegistry } from '../../src/modules/matchers/index.js';
import { MatchersScenarioCaseEntity } from './entities/MatchersScenarioCaseEntity.js';
import scenarioCases from './matchers.scenarios.json' with { 'type': 'json' };

class DateMatchContext implements MatchContextInterface {
  toDateTimestamp(value: unknown): number | null {
    const result = typeof value === 'number' ? value : null;

    return result;
  }

  toStrictNumber(): number | null {
    return null;
  }
}

class NumericMatchContext implements MatchContextInterface {
  toDateTimestamp(): number | null {
    return null;
  }

  toStrictNumber(value: unknown): number | null {
    const result = typeof value === 'number' ? value : null;

    return result;
  }
}

class MatchersRunners {
  private static readonly dateContext: MatchContextInterface = new DateMatchContext();
  private static readonly numericContext: MatchContextInterface = new NumericMatchContext();

  static 'create-and-match-cidr'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'create-and-match-cidr'>): void {
    const handler = MatchersRunners.handlerFor('cidr');
    const created = handler.createMatcher({ 'cidr': scenarioCase.input.definition.cidr, 'type': 'cidr' }, MatchersRunners.emptyGroup());
    assert.ok(created !== null);
    const actual = handler.match(
      created,
      scenarioCase.input.numeric,
      scenarioCase.input.text,
      MatchersRunners.contextFor(scenarioCase.input.context)
    );

    assert.equal(actual, scenarioCase.expected.matches);
  }

  static 'match-alphabetic'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'match-alphabetic'>): void {
    const matcher = scenarioCase.input.matcher;
    MatchersRunners.assertMatch('alphabetic', { 'end': matcher.end, 'group': MatchersRunners.emptyGroup(), 'start': matcher.start }, scenarioCase);
  }

  static 'match-date'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'match-date'>): void {
    const matcher = scenarioCase.input.matcher;
    MatchersRunners.assertMatch('date', { 'afterTs': matcher.afterTs, 'beforeTs': matcher.beforeTs, 'group': MatchersRunners.emptyGroup() }, scenarioCase);
  }

  static 'match-range'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'match-range'>): void {
    const matcher = scenarioCase.input.matcher;
    MatchersRunners.assertMatch('range', { 'group': MatchersRunners.emptyGroup(), 'maximum': matcher.maximum, 'minimum': matcher.minimum }, scenarioCase);
  }

  static 'match-semver'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'match-semver'>): void {
    MatchersRunners.assertMatch('semver', { 'group': MatchersRunners.emptyGroup(), 'range': scenarioCase.input.matcher.range }, scenarioCase);
  }

  static 'match-sequential'(scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'match-sequential'>): void {
    const matcher = scenarioCase.input.matcher;
    MatchersRunners.assertMatch('sequential', {
      'group': MatchersRunners.emptyGroup(),
      'maximum': matcher.maximum,
      'minimum': matcher.minimum,
      'prefix': matcher.prefix,
      'suffix': matcher.suffix
    }, scenarioCase);
  }

  private static assertMatch(
    type: GroupValueDiscriminantEntity.Type,
    matcher: MatcherUnionType,
    scenarioCase: ScenarioCaseOfType<MatchersScenarioCaseEntity.Type, 'match-alphabetic' | 'match-date' | 'match-range' | 'match-semver' | 'match-sequential'>
  ): void {
    const actual = MatchersRunners.handlerFor(type).match(
      matcher,
      scenarioCase.input.numeric,
      scenarioCase.input.text,
      MatchersRunners.contextFor(scenarioCase.input.context)
    );

    assert.equal(actual, scenarioCase.expected.matches);
  }

  private static contextFor(name: string): MatchContextInterface {
    const result = name === 'date' ? MatchersRunners.dateContext : MatchersRunners.numericContext;

    return result;
  }

  private static emptyGroup(): PartitionGroupInterface {
    return { 'groupValue': { 'match': 'placeholder', 'type': 'string' }, 'nodes': [], 'nodeValue': null };
  }

  private static handlerFor(type: GroupValueDiscriminantEntity.Type): MatcherHandlerInterface {
    const handler = matcherRegistry.byType[type];
    assert.ok(handler !== undefined, `no matcher registered for type '${type}'`);

    return handler;
  }
}

ScenarioSuite.register({
  'entity': MatchersScenarioCaseEntity,
  'file': scenarioCases,
  'name': 'drilldown matchers',
  'runners': MatchersRunners
});
