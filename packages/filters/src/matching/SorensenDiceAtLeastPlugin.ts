import { SorensenDiceScorer } from '@studnicky/matching/scorers';

import { Plugin } from '../plugins/Plugin.js';
import { StringArrayPredicate } from './predicates/StringArrayPredicate.js';
import { StringArrayThresholdFilterValuePredicate } from './predicates/StringArrayThresholdFilterValuePredicate.js';

export class SorensenDiceAtLeastPlugin extends Plugin {
  protected override readonly namespace: string = 'SorensenDiceAtLeastPlugin';

  public override operators = {
    'SORENSEN_DICE_AT_LEAST': (value: unknown, filterValue: unknown): boolean => {
      if (!StringArrayPredicate(value) || !StringArrayThresholdFilterValuePredicate(filterValue)) {
        return false;
      }
      const result = SorensenDiceScorer.score(new Set(value), new Set(filterValue.value)) >= filterValue.threshold;
      return result;
    }
  };
}
