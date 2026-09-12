/** mapInferenceToRoute — map inference evidence into TopicRouter selections. Run: npx tsx examples/mapInferenceToRoute.ts */

import type { ScoreEvidenceInterface } from '@studnicky/matching/node';
import type { TopicInferenceInterface, TopicSelectionMapperInterface } from '@studnicky/topic-router-models/node';
import type { TopicSelectionInterface } from '@studnicky/topic-router/node';

import { TopicRouter } from '@studnicky/topic-router/node';
import assert from 'node:assert/strict';

class StaticInference implements TopicInferenceInterface<string> {
  public infer(_input: string): Promise<readonly ScoreEvidenceInterface[]> {
    const result = Promise.resolve([{ 'id': 'billing', 'origin': 'demo-model', 'score': 0.97 }]);
    return result;
  }
}

class EvidenceSelectionMapper implements TopicSelectionMapperInterface {
  public map(evidence: readonly ScoreEvidenceInterface[]): readonly TopicSelectionInterface[] {
    const selections: TopicSelectionInterface[] = [];
    for (let index = 0; index < evidence.length; index += 1) {
      const item = evidence[index];
      if (item === undefined) {
        continue;
      }
      const score = item.score;
      selections.push({ 'id': item.id, 'origin': item.origin, 'scores': { 'demo-model': score } });
    }
    return selections;
  }
}

class MapInferenceToRouteDemo {
  public static async run(): Promise<void> {
    // #region usage
    const received: string[] = [];
    const router = TopicRouter.create<string>({ 'matcher': { 'matches': (): boolean => { return false; } } });
    router.register('billing', (envelope): void => {
      received.push(`${envelope.subscription.id}:${envelope.selection.scores['demo-model']}`);
    }, { 'id': 'billing' });

    const inference = new StaticInference();
    const mapper = new EvidenceSelectionMapper();
    const selections = mapper.map(await inference.infer('I need a refund'));
    const delivered = await router.publishSelected('support.request', 'I need a refund', selections);
    console.log({ 'delivered': delivered, 'selections': selections });
    // #endregion usage

    assert.deepEqual(delivered, ['billing']);
    assert.deepEqual(received, ['billing:0.97']);
    console.log('mapInferenceToRoute: all assertions passed');
  }
}

await MapInferenceToRouteDemo.run();
