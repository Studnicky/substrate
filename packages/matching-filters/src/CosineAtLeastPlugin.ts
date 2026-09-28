import { Plugin } from '@studnicky/filters/browser';
import { CosineScorer } from '@studnicky/matching/browser';

import { StringNumberMapPredicate } from './predicates/StringNumberMapPredicate.js';
import { VectorThresholdFilterValuePredicate } from './predicates/VectorThresholdFilterValuePredicate.js';

export class CosineAtLeastPlugin extends Plugin {
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
