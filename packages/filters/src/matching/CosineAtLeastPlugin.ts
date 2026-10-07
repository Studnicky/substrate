
import { CosineScorer } from '#runtime';

import { Plugin } from '../plugins/Plugin.js';
import { StringNumberMapPredicate } from './predicates/StringNumberMapPredicate.js';
import { VectorThresholdFilterValuePredicate } from './predicates/VectorThresholdFilterValuePredicate.js';

export class CosineAtLeastPlugin extends Plugin {
  protected override readonly namespace: string = 'CosineAtLeastPlugin';

  public override operators = {
    'COSINE_AT_LEAST': (value: unknown, filterValue: unknown): boolean => {
      if (!StringNumberMapPredicate(value) || !VectorThresholdFilterValuePredicate(filterValue)) {
        return false;
      }
      const result = CosineScorer.score(value, filterValue.value) >= filterValue.threshold;
      return result;
    }
  };
}
