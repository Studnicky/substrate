import { Plugin } from '@studnicky/filters';
import { LevenshteinScorer } from '@studnicky/matching';
import { Predicates } from '@studnicky/types';

import { TextThresholdFilterValuePredicate } from './predicates/TextThresholdFilterValuePredicate.js';

export class LevenshteinAtLeastPlugin extends Plugin {
  public override operators = {
    'LEVENSHTEIN_AT_LEAST': (value: unknown, filterValue: unknown): boolean => {
      if (!Predicates.isString(value) || !TextThresholdFilterValuePredicate(filterValue)) {
        return false;
      }
      const result = LevenshteinScorer.score(value, filterValue.value) >= filterValue.threshold;
      return result;
    }
  };
}
