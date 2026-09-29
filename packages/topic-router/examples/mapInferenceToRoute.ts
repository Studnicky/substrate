/** mapInferenceToRoute — route a Northstar Books title request from inference evidence to the catalogue service. Run: npx tsx examples/mapInferenceToRoute.ts */

import type { ScoreEvidenceInterface } from '@studnicky/matching/node';
import type { TopicInferenceInterface, TopicSelectionMapperInterface } from '@studnicky/topic-router/models';
import type { TopicSelectionInterface } from '@studnicky/topic-router/node';

import { TopicRouter } from '@studnicky/topic-router/node';

class StaticInference implements TopicInferenceInterface<string> {
  public infer(_input: string): Promise<readonly ScoreEvidenceInterface[]> {
    const result = Promise.resolve([{ 'id': 'catalogue', 'origin': 'northstar-title-model', 'score': 0.97 }]);
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
      selections.push({ 'id': item.id, 'origin': item.origin, 'scores': { 'northstar-title-model': score } });
    }
    return selections;
  }
}

class MapInferenceToRouteDemo {
  public static async run(): Promise<void> {
    // #region usage
    const received: string[] = [];
    const router = TopicRouter.create<string>({ 'matcher': { 'matches': (): boolean => { return false; } } });
    router.register('catalogue', (envelope): void => {
      received.push(`${envelope.subscription.id}:${envelope.selection.scores['northstar-title-model']}`);
    }, { 'id': 'catalogue' });

    const inference = new StaticInference();
    const mapper = new EvidenceSelectionMapper();
    const selections = mapper.map(await inference.infer('Find The Dispossessed by Ursula K. Le Guin'));
    const delivered = await router.publishSelected('bookstore.catalogue.title-request', 'Find The Dispossessed by Ursula K. Le Guin', selections);
    console.log({ 'delivered': delivered, 'selections': selections });
    // #endregion usage

    if (delivered.length !== 1 || delivered[0] !== 'catalogue' || received.length !== 1 || received[0] !== 'catalogue:0.97') {
      throw new Error('Expected the Northstar catalogue request to route to the catalogue subscription.');
    }
    console.log('mapInferenceToRoute: all assertions passed');
  }
}

await MapInferenceToRouteDemo.run();
