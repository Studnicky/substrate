import { JaccardScorer } from '@studnicky/matching';
import { Plugin } from '@studnicky/types/filters';

import { StringArrayPredicate } from './predicates/StringArrayPredicate.js';
import { StringArrayThresholdFilterValuePredicate } from './predicates/StringArrayThresholdFilterValuePredicate.js';

export class JaccardAtLeastPlugin extends Plugin {
  public override operators = {
    'JACCARD_AT_LEAST': (value: unknown, filterValue: unknown): boolean => {
      if (!StringArrayPredicate(value) || !StringArrayThresholdFilterValuePredicate(filterValue)) {
        return false;
      }
      const result = JaccardScorer.score(new Set(value), new Set(filterValue.value)) >= filterValue.threshold;
      return result;
    }
  };
}
