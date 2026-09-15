import { Plugin } from '@studnicky/filters/node';
import { NgramScorer } from '@studnicky/matching/node';
import { Predicates } from '@studnicky/types/node';

import { NgramThresholdFilterValuePredicate } from './predicates/NgramThresholdFilterValuePredicate.js';

export class NgramAtLeastPlugin extends Plugin {
  public override operators = {
    'NGRAM_AT_LEAST': (value: unknown, filterValue: unknown): boolean => {
      if (!Predicates.isString(value) || !NgramThresholdFilterValuePredicate(filterValue)) {
        return false;
      }
      const result = NgramScorer.score(value, filterValue.value, filterValue.size) >= filterValue.threshold;
      return result;
    }
  };
}
