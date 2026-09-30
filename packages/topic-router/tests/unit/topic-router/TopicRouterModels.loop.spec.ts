import type { ScoreEvidenceInterface } from '@studnicky/matching/node';
import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';
import type { TopicSelectionInterface } from '@studnicky/topic-router/node';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { TopicInferenceInterface, TopicSelectionMapperInterface } from '../../../src/models/index.js';

import { TopicRouterModelsScenarioCaseEntity } from './entities/TopicRouterModelsScenarioCaseEntity.js';
import scenarioGroups from './TopicRouterModels.scenarios.json' with { 'type': 'json' };

class StaticInference implements TopicInferenceInterface<string> {
  public constructor(private readonly evidence: ScoreEvidenceInterface) {}
  public infer(_input: string): Promise<readonly ScoreEvidenceInterface[]> {
    const inferred = Promise.resolve([this.evidence]);
    return inferred;
  }
}

class EvidenceSelectionMapper implements TopicSelectionMapperInterface {
  public map(evidence: readonly ScoreEvidenceInterface[]): readonly TopicSelectionInterface[] {
    const result: TopicSelectionInterface[] = [];
    for (let index = 0; index < evidence.length; index += 1) {
      const item = evidence[index];
      if (item !== undefined) {
        const scores: Record<string, number> = {};
        Object.defineProperty(scores, item.origin, { 'enumerable': true, 'value': item.score });
        result.push({ 'id': item.id, 'origin': item.origin, 'scores': scores });
      }
    }
    return result;
  }
}

class TopicRouterModelsRunners {
  static async 'inference-to-selection'(scenarioCase: ScenarioCaseOfType<TopicRouterModelsScenarioCaseEntity.Type, 'inference-to-selection'>): Promise<void> {
    const inference = new StaticInference({ 'id': scenarioCase.input.id, 'origin': scenarioCase.input.origin, 'score': scenarioCase.input.score });
    const selections = new EvidenceSelectionMapper().map(await inference.infer(scenarioCase.input.content));
    assert.equal(selections.at(0)?.id, scenarioCase.expected.id);
    assert.equal(selections.at(0)?.origin, scenarioCase.expected.origin);
    assert.equal(selections.at(0)?.scores?.[scenarioCase.expected.origin], scenarioCase.expected.score);
  }
}

ScenarioSuite.register({
  'entity': TopicRouterModelsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'topic router model contracts',
  'runners': TopicRouterModelsRunners
});
