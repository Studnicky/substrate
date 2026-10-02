import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { GlobMatcher, TreeMatcher } from '@studnicky/matching/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { TopicRouterOptionsInterface, TopicSelectionInterface } from '../../../src/index.js';

import { TopicRouter } from '../../../src/index.js';
import { TopicRouterScenarioCaseEntity } from './entities/TopicRouterScenarioCaseEntity.js';
import scenarioGroups from './TopicRouter.scenarios.json' with { 'type': 'json' };

class ObservedTopicRouter extends TopicRouter<null> {
  public readonly 'matchLog': string[] = [];
  public readonly 'noMatchLog': string[] = [];
  public readonly 'poolExhaustedLog': string[] = [];
  public readonly 'selectionLog': TopicSelectionInterface[] = [];

  public static observed(options: TopicRouterOptionsInterface): ObservedTopicRouter {
    const result = new ObservedTopicRouter(options);
    return result;
  }

  protected override onMatch(topic: string, ids: readonly string[]): void {
    this.matchLog.push(`${topic}:${ids.join(',')}`);
  }

  protected override onNoMatch(topic: string): void {
    this.noMatchLog.push(topic);
  }

  protected override onPoolExhausted(topic: string): void {
    this.poolExhaustedLog.push(topic);
  }

  protected override onSelection(_topic: string, selection: TopicSelectionInterface): void {
    this.selectionLog.push(selection);
  }
}

class TopicRouterRunners {
  static async 'candidate-source'(scenarioCase: ScenarioCaseOfType<TopicRouterScenarioCaseEntity.Type, 'candidate-source'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const delivered: string[] = [];
    const router = TopicRouter.create<string>({
      'candidateSource': { 'candidates': (): readonly string[] => { const candidates = ['indexed', 'unknown']; return candidates; } }
    });
    router.register('builder.owned', (envelope): void => { delivered.push(envelope.payload); }, { 'id': 'indexed' });
    assert.deepEqual(await router.publish(input.topic, input.payload), expected.ids);
    assert.deepEqual(delivered, expected.delivered);
  }

  static 'generated-identifier'(scenarioCase: ScenarioCaseOfType<TopicRouterScenarioCaseEntity.Type, 'generated-identifier'>): void {
    const { expected, input } = scenarioCase;
    const router = TopicRouter.create<null>({ 'matcher': { 'matches': (): boolean => { const matched = false; return matched; } } });
    const id = router.register(input.pattern, (): void => {});
    assert.equal(id.length > 0, expected.hasIdentifier);
    assert.equal(router.unregister(id), expected.unregistered);
  }

  static async 'matched-publish'(scenarioCase: ScenarioCaseOfType<TopicRouterScenarioCaseEntity.Type, 'matched-publish'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const delivered: string[] = [];
    const router = TopicRouter.create<{ readonly 'ok': boolean }>({
      'matcher': { 'matches': (pattern: string, topic: string): boolean => { const matched = GlobMatcher.matches(pattern, topic); return matched; } }
    });
    router.register('api.**', (envelope): Promise<void> => { delivered.push(envelope.subscription.id); const settled = Promise.resolve(); return settled; }, { 'id': 'audit' });
    router.register('api.*.users', (envelope): Promise<void> => { delivered.push(envelope.subscription.id); const settled = Promise.resolve(); return settled; }, { 'id': 'users' });
    assert.deepEqual(await router.publish(input.topic, { 'ok': true }), expected.ids);
    assert.deepEqual(delivered, expected.delivered);
  }

  static async 'observer-hooks'(scenarioCase: ScenarioCaseOfType<TopicRouterScenarioCaseEntity.Type, 'observer-hooks'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const router = ObservedTopicRouter.observed({
      'matcher': { 'matches': (pattern: string, topic: string): boolean => { const matched = pattern === topic; return matched; } }
    });
    router.register(input.matchingTopic, (): void => {}, { 'id': input.id });
    assert.deepEqual(await router.publish(input.matchingTopic, null), expected.ids);
    assert.deepEqual(router.matchLog, expected.matchLog);
    assert.deepEqual(router.selectionLog, [{ 'id': input.id, 'origin': 'matcher' }]);
    assert.deepEqual(router.match(input.unmatchedTopic), []);
    assert.deepEqual(router.noMatchLog, expected.noMatchLog);

    const candidateRouter = ObservedTopicRouter.observed({
      'candidateSource': { 'candidates': (): readonly string[] => { const candidates: readonly string[] = []; return candidates; } }
    });
    assert.deepEqual(candidateRouter.match(input.unmatchedTopic), []);
    assert.deepEqual(candidateRouter.poolExhaustedLog, expected.poolExhaustedLog);
  }

  static async 'selected-publish'(scenarioCase: ScenarioCaseOfType<TopicRouterScenarioCaseEntity.Type, 'selected-publish'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const router = TopicRouter.create<null>({ 'matcher': { 'matches': (): boolean => { const matched = false; return matched; } } });
    let metadata: unknown;
    let origin = '';
    router.register('unmatched', (envelope): void => { metadata = envelope.metadata; origin = envelope.selection.origin; }, { 'id': input.id });
    assert.deepEqual(
      await router.publishSelected(input.topic, null, [{ 'id': input.id, 'origin': input.origin }], { 'metadata': input.metadata }),
      expected.ids
    );
    assert.deepEqual(metadata, expected.metadata);
    assert.equal(origin, expected.origin);
  }

  static async 'tree-candidate-source'(scenarioCase: ScenarioCaseOfType<TopicRouterScenarioCaseEntity.Type, 'tree-candidate-source'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const tree = new TreeMatcher();
    tree.register('audit', input.pattern);
    const delivered: string[] = [];
    const router = TopicRouter.create<string>({ 'candidateSource': tree });
    router.register('builder.owned', (envelope): void => { delivered.push(envelope.subscription.id); }, { 'id': 'audit' });
    assert.deepEqual(await router.publish(input.topic, input.payload), expected.ids);
    assert.deepEqual(delivered, expected.delivered);
  }
}

ScenarioSuite.register({
  'entity': TopicRouterScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'TopicRouter',
  'runners': TopicRouterRunners
});
