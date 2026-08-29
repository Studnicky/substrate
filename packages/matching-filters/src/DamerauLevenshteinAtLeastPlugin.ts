import { DamerauLevenshteinScorer } from '@studnicky/matching';
import { Predicates } from '@studnicky/types';
import { Plugin } from '@studnicky/types/filters';

import { TextThresholdFilterValuePredicate } from './predicates/TextThresholdFilterValuePredicate.js';

export class DamerauLevenshteinAtLeastPlugin extends Plugin {
  public override operators = {
    'DAMERAU_LEVENSHTEIN_AT_LEAST': (value: unknown, filterValue: unknown): boolean => {
      if (!Predicates.isString(value) || !TextThresholdFilterValuePredicate(filterValue)) {
        return false;
      }
      const result = DamerauLevenshteinScorer.score(value, filterValue.value) >= filterValue.threshold;
      return result;
    }
  };
}
