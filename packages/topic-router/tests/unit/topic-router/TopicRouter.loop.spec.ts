import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GlobMatcher, TreeMatcher } from '@studnicky/matching';
import { Predicates } from '@studnicky/types';

import type { TopicRouterOptionsInterface, TopicSelectionInterface } from '../../../src/index.js';
import { TopicRouter } from '../../../src/index.js';
import scenarioGroups from './TopicRouter.scenarios.json' with { type: 'json' };

type ScenarioCase = Record<string, unknown>;
type ScenarioShape =
  | 'candidate-source'
  | 'generated-identifier'
  | 'matched-publish'
  | 'observer-hooks'
  | 'selected-publish'
  | 'tree-candidate-source';

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

void describe('TopicRouter', () => {
  for (const scenarioCase of scenarioGroups.cases) {
    void it(requireString(requireValue(scenarioCase, 'name'), 'scenario name'), async () => {
      await runScenario(requireRecord(scenarioCase, 'scenario case'));
    });
  }
});

async function runScenario(scenarioCase: ScenarioCase): Promise<void> {
  const shape = requireShape(requireValue(scenarioCase, 'shape'));
  const input = requireRecord(requireValue(scenarioCase, 'input'));
  const expected = requireRecord(requireValue(scenarioCase, 'expected'));

  switch (shape) {
    case 'matched-publish': {
      const delivered: string[] = [];
      const router = TopicRouter.create<{ readonly ok: boolean }>({
        'matcher': { 'matches': (pattern: string, topic: string): boolean => { return GlobMatcher.matches(pattern, topic); } }
      });
      router.register('api.**', async (envelope): Promise<void> => { delivered.push(envelope.subscription.id); }, { 'id': 'audit' });
      router.register('api.*.users', async (envelope): Promise<void> => { delivered.push(envelope.subscription.id); }, { 'id': 'users' });
      assert.deepEqual(await router.publish(requireString(requireValue(input, 'topic')), { 'ok': true }), requireStringArray(requireValue(expected, 'ids')));
      assert.deepEqual(delivered, requireStringArray(requireValue(expected, 'delivered')));
      return;
    }
    case 'selected-publish': {
      const router = TopicRouter.create<null>({ 'matcher': { 'matches': (): boolean => { return false; } } });
      let origin = '';
      router.register('unmatched', (envelope): void => { origin = envelope.selection.origin; }, { 'id': requireString(requireValue(input, 'id')) });
      assert.deepEqual(
        await router.publishSelected(requireString(requireValue(input, 'topic')), null, [{ 'id': requireString(requireValue(input, 'id')), 'origin': requireString(requireValue(input, 'origin')) }]),
        requireStringArray(requireValue(expected, 'ids')),
      );
      assert.equal(origin, requireString(requireValue(expected, 'origin')));
      return;
    }
    case 'candidate-source': {
      const delivered: string[] = [];
      const router = TopicRouter.create<string>({
        'candidateSource': { 'candidates': (): readonly string[] => { return ['indexed', 'unknown']; } }
      });
      router.register('builder.owned', (envelope): void => { delivered.push(envelope.payload); }, { 'id': 'indexed' });
      assert.deepEqual(await router.publish(requireString(requireValue(input, 'topic')), requireString(requireValue(input, 'payload'))), requireStringArray(requireValue(expected, 'ids')));
      assert.deepEqual(delivered, requireStringArray(requireValue(expected, 'delivered')));
      return;
    }
    case 'tree-candidate-source': {
      const tree = new TreeMatcher();
      tree.register('audit', requireString(requireValue(input, 'pattern')));
      const delivered: string[] = [];
      const router = TopicRouter.create<string>({ 'candidateSource': tree });
      router.register('builder.owned', (envelope): void => { delivered.push(envelope.subscription.id); }, { 'id': 'audit' });
      assert.deepEqual(await router.publish(requireString(requireValue(input, 'topic')), requireString(requireValue(input, 'payload'))), requireStringArray(requireValue(expected, 'ids')));
      assert.deepEqual(delivered, requireStringArray(requireValue(expected, 'delivered')));
      return;
    }
    case 'generated-identifier': {
      const router = TopicRouter.create<null>({ 'matcher': { 'matches': (): boolean => { return false; } } });
      const id = router.register(requireString(requireValue(input, 'pattern')), (): void => {});
      assert.equal(id.length > 0, requireBoolean(requireValue(expected, 'hasIdentifier')));
      assert.equal(router.unregister(id), requireBoolean(requireValue(expected, 'unregistered')));
      return;
    }
    case 'observer-hooks': {
      const router = ObservedTopicRouter.observed({
        'matcher': { 'matches': (pattern: string, topic: string): boolean => { return pattern === topic; } }
      });
      router.register(requireString(requireValue(input, 'matchingTopic')), (): void => {}, { 'id': requireString(requireValue(input, 'id')) });
      assert.deepEqual(await router.publish(requireString(requireValue(input, 'matchingTopic')), null), requireStringArray(requireValue(expected, 'ids')));
      assert.deepEqual(router.matchLog, requireStringArray(requireValue(expected, 'matchLog')));
      assert.deepEqual(router.selectionLog, [{ 'id': requireString(requireValue(input, 'id')), 'origin': 'matcher' }]);
      assert.deepEqual(router.match(requireString(requireValue(input, 'unmatchedTopic'))), []);
      assert.deepEqual(router.noMatchLog, requireStringArray(requireValue(expected, 'noMatchLog')));

      const candidateRouter = ObservedTopicRouter.observed({
        'candidateSource': { 'candidates': (): readonly string[] => { return []; } }
      });
      assert.deepEqual(candidateRouter.match(requireString(requireValue(input, 'unmatchedTopic'))), []);
      assert.deepEqual(candidateRouter.poolExhaustedLog, requireStringArray(requireValue(expected, 'poolExhaustedLog')));
      return;
    }
  }

  return assertNever(shape);
}

function assertNever(value: never): never {
  throw new Error(`Unsupported scenario shape: ${value}`);
}

function requireBoolean(value: unknown): boolean {
  if (Predicates.isBoolean(value)) {
    return value;
  }
  throw new TypeError('Expected a boolean scenario value.');
}

function requireRecord(value: unknown, context = 'scenario value'): Record<string, unknown> {
  if (Predicates.isRecord(value)) {
    return value;
  }
  throw new TypeError(`Expected ${context} to be a record.`);
}

function requireShape(value: unknown): ScenarioShape {
  if (!Predicates.isString(value)) {
    throw new TypeError('Expected scenario shape to be a string.');
  }

  switch (value) {
    case 'candidate-source':
    case 'generated-identifier':
    case 'matched-publish':
    case 'observer-hooks':
    case 'selected-publish':
    case 'tree-candidate-source':
      return value;
    default:
      throw new TypeError(`Unsupported scenario shape: ${value}`);
  }
}

function requireString(value: unknown, context = 'scenario value'): string {
  if (Predicates.isString(value)) {
    return value;
  }
  throw new TypeError(`Expected ${context} to be a string.`);
}

function requireStringArray(value: unknown): string[] {
  if (!Predicates.isArray(value)) {
    throw new TypeError('Expected a string-array scenario value.');
  }

  const result: string[] = [];
  for (const item of value) {
    result.push(requireString(item));
  }
  return result;
}

function requireValue(record: Record<string, unknown>, key: string): unknown {
  if (Object.hasOwn(record, key)) {
    return record[key];
  }
  throw new TypeError(`Expected scenario value ${key}.`);
}
