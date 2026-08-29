import { SorensenDiceScorer } from '@studnicky/matching';
import { Plugin } from '@studnicky/types/filters';

import { StringArrayPredicate } from './predicates/StringArrayPredicate.js';
import { StringArrayThresholdFilterValuePredicate } from './predicates/StringArrayThresholdFilterValuePredicate.js';

export class SorensenDiceAtLeastPlugin extends Plugin {
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
