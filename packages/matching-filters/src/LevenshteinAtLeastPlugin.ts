import { Plugin } from '@studnicky/filters/node';
import { LevenshteinScorer } from '@studnicky/matching/node';
import { Predicates } from '@studnicky/types/node';

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
