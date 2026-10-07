
import { JaccardScorer } from '#runtime';

import { Plugin } from '../plugins/Plugin.js';
import { StringArrayPredicate } from './predicates/StringArrayPredicate.js';
import { StringArrayThresholdFilterValuePredicate } from './predicates/StringArrayThresholdFilterValuePredicate.js';

export class JaccardAtLeastPlugin extends Plugin {
  protected override readonly namespace: string = 'JaccardAtLeastPlugin';

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
